from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import tempfile
import json
from dotenv import load_dotenv

from backend.database import engine, Base, get_db, SessionLocal
from backend.models import User, Quiz, Submission, Score
from backend.services.gemini import GeminiService
from backend.services.deepseek import DeepSeekService
from backend.services.collation import ScriptCollator

load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Playbook Ecosystem API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
gemini_service = GeminiService()
deepseek_service = DeepSeekService()
script_collator = ScriptCollator(gemini_service)

async def grade_submission_task(submission_id: int):
    """
    Background task to grade a submission.
    """
    db = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.id == submission_id).first()
        if not submission:
            return

        # Mock text retrieval (in real app, use stored text or re-OCR)
        ocr_text = "Student Answer Content..."
        rubric = "Standard Rubric..."

        # Validate
        validation = await deepseek_service.validate_content(ocr_text)
        if not validation.get("is_valid", True):
            submission.status = "flagged"
            db.commit()
            return

        # Grade
        grading_result = await deepseek_service.grade_submission(ocr_text, rubric)

        # Save Score
        score = Score(
            submission_id=submission.id,
            total_marks=grading_result.get("total_marks", 0),
            breakdown=grading_result.get("breakdown", []),
            remarks=grading_result.get("general_remarks"),
            confidence_score=grading_result.get("confidence_score"),
            audit_trail=grading_result.get("audit_trail")
        )
        db.add(score)
        submission.status = "graded"
        db.commit()
    except Exception as e:
        print(f"Grading Error: {e}")
    finally:
        db.close()

async def process_upload_background(file_path: str, content_type: str, quiz_id: int):
    """
    Background task to process upload (Collation -> Creation -> Grading Trigger).
    """
    db = SessionLocal()
    try:
        saved_submission_ids = []

        if content_type == "application/pdf":
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()

            scripts = await script_collator.collate_scripts(pdf_bytes)

            for script in scripts:
                db_submission = Submission(
                    quiz_id=quiz_id,
                    student_reg_no=script.get("student_id", "UNKNOWN"),
                    student_name=script.get("student_name"),
                    file_path=file_path, # Ideally save slice
                    status="processing"
                )
                db.add(db_submission)
                db.commit()
                db.refresh(db_submission)
                saved_submission_ids.append(db_submission.id)

        else:
            # Image
            result = await gemini_service.extract_data_from_file(file_path, content_type)
            db_submission = Submission(
                quiz_id=quiz_id,
                student_reg_no=result.get("reg_no", "UNKNOWN"),
                student_name=result.get("student_name"),
                file_path=file_path,
                status="processing"
            )
            db.add(db_submission)
            db.commit()
            db.refresh(db_submission)
            saved_submission_ids.append(db_submission.id)

        # Trigger Grading for each
        for sub_id in saved_submission_ids:
            # In real system, push to queue (Celery/RQ). Here, loop in background task.
            await grade_submission_task(sub_id)

    except Exception as e:
        print(f"Processing Error: {e}")
    finally:
        db.close()
        # Clean up temp file? Maybe later.

@app.get("/")
def read_root():
    return {"message": "Playbook Ecosystem Backend is Running"}

@app.post("/api/upload")
async def upload_scripts(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads a PDF (multi-page scripts) or Image.
    Collates scripts using Gemini (1000-page logic).
    Stores them as Submissions in DB.
    """
    try:
        # Save uploaded file to temp
        # Use temp directory that persists for background task
        # Ideally use S3 or structured storage.

        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        content_type = file.content_type

        # Add background task
        background_tasks.add_task(process_upload_background, tmp_path, content_type, 1) # quiz_id=1

        return {"message": "Upload received. Processing started in background."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/grade/{submission_id}")
async def manual_grade_submission(submission_id: int, rubric: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Manually triggers grading.
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    background_tasks.add_task(grade_submission_task, submission_id)
    return {"message": "Grading queued."}

@app.post("/api/chat")
async def chat(query: str, db: Session = Depends(get_db)):
    """
    Omniscient Chatbot.
    """
    scores = db.query(Score).limit(10).all()
    context_data = json.dumps([{"id": s.id, "marks": s.total_marks, "remarks": s.remarks} for s in scores])

    response = await deepseek_service.chat_with_context(context_data, query)
    return {"response": response}

@app.get("/api/results")
async def get_results(db: Session = Depends(get_db)):
    submissions = db.query(Submission).all()
    return submissions
