from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    role = Column(String)  # 'lecturer', 'student'
    is_active = Column(Boolean, default=True)

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    title = Column(String)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deadline = Column(DateTime, nullable=True)
    time_limit_minutes = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)

    # Settings
    auto_release_results = Column(Boolean, default=False)
    allow_upload = Column(Boolean, default=True)

    submissions = relationship("Submission", back_populates="quiz")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    student_reg_no = Column(String, index=True)
    student_name = Column(String, nullable=True)
    file_path = Column(String, nullable=True) # Path to uploaded PDF/Images
    submitted_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending") # pending, processing, graded, flagged

    quiz = relationship("Quiz", back_populates="submissions")
    score = relationship("Score", back_populates="submission", uselist=False)

class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    total_marks = Column(Float)
    breakdown = Column(JSON) # Detailed marks per question
    remarks = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)
    audit_trail = Column(JSON, nullable=True) # AI reasoning logs

    submission = relationship("Submission", back_populates="score")
