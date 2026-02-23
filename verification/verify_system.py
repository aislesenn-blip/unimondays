import requests
import sqlite3
import time
import os
import uuid

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"
DB_PATH = "prisma/dev.db"

def setup_db():
    print("Setting up test data...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create Lecturer
    lecturer_id = str(uuid.uuid4())
    cursor.execute("INSERT OR IGNORE INTO User (id, email, name, role, createdAt) VALUES (?, ?, ?, ?, datetime('now'))",
                   (lecturer_id, "lecturer@playbook.com", "Dr. Playbook", "LECTURER"))

    # Create Quiz
    quiz_id = "CS101-TEST"
    # Check if exists
    cursor.execute("SELECT id FROM Quiz WHERE code = ?", (quiz_id,))
    row = cursor.fetchone()
    if not row:
        cursor.execute("INSERT INTO Quiz (id, title, code, lecturerId, className, markingScheme, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
                       (quiz_id, "Intro to CS", quiz_id, lecturer_id, "CS101", "Standard rubric: 10 marks per question. Look for keywords: algorithm, complexity."))
        conn.commit()

    conn.close()
    return quiz_id

def submit_quiz(quiz_id):
    print("Submitting quiz...")
    # Create dummy file
    with open("test_submission.txt", "w") as f:
        f.write("This is a test submission for CS101. Answer to Q1: Algorithms are steps to solve a problem. Answer to Q2: Big O notation describes complexity.")

    files = {'file': open("test_submission.txt", 'rb')}
    data = {'quiz_id': quiz_id, 'student_id': 'student-1'}

    response = requests.post(f"{BASE_URL}/submit", files=files, data=data)
    print(f"Submit Response: {response.status_code} - {response.text}")
    if response.status_code == 200:
        return response.json().get("submission_id")
    return None

def wait_for_result(submission_id):
    print(f"Waiting for result for submission {submission_id}...")
    for _ in range(30): # Wait up to 60 seconds
        response = requests.get(f"{BASE_URL}/submission/{submission_id}")
        if response.status_code == 200:
            data = response.json()
            status = data.get("status")
            print(f"Status: {status}")
            if status in ["COMPLETED", "FLAGGED", "ERROR"]:
                return data
        time.sleep(2)
    return None

def main():
    try:
        quiz_id = setup_db()
        submission_id = submit_quiz(quiz_id)
        if submission_id:
            result = wait_for_result(submission_id)
            if result:
                print("Final Result:", result)
                if result.get("status") == "COMPLETED":
                    print("✅ Verification SUCCESS: Submission processed and graded.")
                else:
                    print(f"❌ Verification FAILED: Status is {result.get('status')}")
            else:
                print("❌ Verification FAILED: Timed out waiting for result.")
        else:
            print("❌ Verification FAILED: Submission failed.")
    except Exception as e:
        print(f"❌ Verification FAILED with Exception: {e}")

if __name__ == "__main__":
    main()
