from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from backend.utils.ai import gemini_ocr, deepseek_grade, deepseek_chat
from backend.utils.validation import validate_submission_content
import os
import shutil
import uuid
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(".env.local")

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
DB_URL = "sqlite:///./prisma/dev.db"
engine = create_engine(DB_URL)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "playbook-backend"}

async def process_submission_task(submission_id: str, file_path: str, quiz_id: str):
    """
    Background task: OCR -> Validate -> Grade
    """
    print(f"Processing submission {submission_id} for quiz {quiz_id}")
    try:
        # 1. OCR (Gemini)
        with open(file_path, "rb") as f:
            image_bytes = f.read()

        ocr_result = await gemini_ocr(image_bytes)
        extracted_text = ocr_result.get("text", "")
        detected_id = ocr_result.get("detected_id", False)
        reg_no = ocr_result.get("reg_no")

        # Update Submission with text and detected RegNo
        with engine.connect() as conn:
            conn.execute(text("UPDATE Submission SET textContent = :text, regNo = :regNo, status = 'PROCESSING' WHERE id = :id"),
                         {"text": extracted_text, "regNo": reg_no if reg_no else "UNKNOWN", "id": submission_id})
            conn.commit()

        # 2. Validation (Anti-Garbage)
        validation = validate_submission_content(extracted_text)
        if not validation["valid"]:
            with engine.connect() as conn:
                conn.execute(text("UPDATE Submission SET status = 'FLAGGED', confidence = 0.0 WHERE id = :id"), {"id": submission_id})
                # Create result with error
                result_id = str(uuid.uuid4())
                conn.execute(text("INSERT INTO Result (id, submissionId, totalScore, breakdown, remarks, auditLog, createdAt) VALUES (:id, :subId, 0, '{}', :reason, 'Validation Failed', datetime('now'))"),
                             {"id": result_id, "subId": submission_id, "reason": validation["reason"]})
                conn.commit()
            return

        # 3. Grading (DeepSeek)
        # Fetch quiz rubric
        with engine.connect() as conn:
            rubric_row = conn.execute(text("SELECT markingScheme FROM Quiz WHERE id = :id"), {"id": quiz_id}).fetchone()
            rubric = rubric_row[0] if rubric_row else None

        if not rubric:
            rubric = "Standard Rubric: 10 marks per question. Clear reasoning required."

        grade_result = await deepseek_grade(extracted_text, rubric)

        # Save Result
        result_id = str(uuid.uuid4())
        breakdown_json = json.dumps(grade_result.get("breakdown", {}))

        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO Result (id, submissionId, totalScore, breakdown, remarks, auditLog, createdAt)
                VALUES (:id, :subId, :score, :breakdown, :remarks, :audit, datetime('now'))
            """), {
                "id": result_id,
                "subId": submission_id,
                "score": grade_result.get("total_score", 0),
                "breakdown": breakdown_json,
                "remarks": grade_result.get("remarks", ""),
                "audit": grade_result.get("audit_log", "")
            })

            # Update Submission Status
            conn.execute(text("UPDATE Submission SET status = 'COMPLETED', score = :score WHERE id = :id"),
                         {"score": grade_result.get("total_score", 0), "id": submission_id})
            conn.commit()

    except Exception as e:
        print(f"Error processing submission {submission_id}: {e}")
        with engine.connect() as conn:
             conn.execute(text("UPDATE Submission SET status = 'ERROR' WHERE id = :id"), {"id": submission_id})
             conn.commit()

@app.post("/api/submit")
async def submit_quiz(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    quiz_id: str = Form(...),
    student_id: str = Form(None)
):
    submission_id = str(uuid.uuid4())

    # Save file temporarily
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    file_path = f"{upload_dir}/{submission_id}_{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Create DB Entry
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO Submission (id, quizId, studentId, regNo, fileUrl, status, createdAt)
                VALUES (:id, :quizId, :studentId, 'PENDING', :fileUrl, 'PENDING', datetime('now'))
            """), {
                "id": submission_id,
                "quizId": quiz_id,
                "studentId": student_id,
                "fileUrl": file_path
            })
            conn.commit()

        # Trigger Background Task
        background_tasks.add_task(process_submission_task, submission_id, file_path, quiz_id)

        return {"status": "queued", "submission_id": submission_id}
    except Exception as e:
        print(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/submission/{submission_id}")
def get_submission(submission_id: str):
    with engine.connect() as conn:
        row = conn.execute(text("SELECT * FROM Submission WHERE id = :id"), {"id": submission_id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Submission not found")

        # Map row to dict manually
        # id, quizId, studentId, regNo, fileUrl, textContent, score, status, confidence, createdAt
        # status is usually index 7
        status = row.status

        result_data = None
        if status == "COMPLETED":
            res_row = conn.execute(text("SELECT * FROM Result WHERE submissionId = :id"), {"id": submission_id}).fetchone()
            if res_row:
                result_data = {
                    "totalScore": res_row.totalScore,
                    "breakdown": json.loads(res_row.breakdown),
                    "remarks": res_row.remarks,
                    "auditLog": res_row.auditLog
                }
        elif status == "FLAGGED":
             res_row = conn.execute(text("SELECT * FROM Result WHERE submissionId = :id"), {"id": submission_id}).fetchone()
             if res_row:
                result_data = {
                    "remarks": res_row.remarks, # Reason
                    "auditLog": res_row.auditLog
                }

        return {
            "id": row.id,
            "status": status,
            "score": row.score,
            "result": result_data
        }

@app.post("/api/chat")
async def chat_endpoint(
    message: str = Form(...),
    context: str = Form("General Context")
):
    # In real app, we'd fetch context from DB based on user session/quiz
    response = await deepseek_chat([], context + "\n\nUser Question: " + message)
    return {"response": response}
