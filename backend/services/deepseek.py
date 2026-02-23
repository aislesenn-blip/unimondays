from openai import AsyncOpenAI
import json
import os
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
if not DEEPSEEK_API_KEY:
    raise ValueError("DEEPSEEK_API_KEY not found in environment")

class DeepSeekService:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com"
        )
        self.model = "deepseek-chat"

    async def validate_content(self, ocr_text: str) -> dict:
        """
        Validates content asynchronously.
        """
        prompt = f"""
        Analyze this OCR text. Determine if it is a valid academic student script/answer sheet or GARBAGE (e.g., National ID, Birth Certificate, random newspaper, unrelated text).

        Text Start:
        {ocr_text[:500]}...
        Text End.

        Return ONLY valid JSON:
        {{
            "is_valid": true/false,
            "reason": "If invalid, explain why (e.g., 'Document appears to be a National ID card')."
        }}
        """

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a document validation engine."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"DeepSeek Validation Error: {e}")
            return {"is_valid": False, "reason": f"Validation Error: {str(e)}"}

    async def grade_submission(self, ocr_text: str, rubric: str) -> dict:
        """
        Grades submission asynchronously.
        """
        prompt = f"""
        You are a strict academic grader.

        RUBRIC:
        {rubric}

        STUDENT SUBMISSION (OCR TEXT):
        {ocr_text}

        TASK:
        1. Grade the submission strictly against the rubric.
        2. Provide marks for each question.
        3. Provide detailed remarks.
        4. Calculate total score.
        5. Provide a confidence score (0-100) on your grading accuracy based on text clarity.

        OUTPUT FORMAT (JSON ONLY):
        {{
            "total_marks": 0.0,
            "breakdown": [
                {{ "question": "Q1", "marks": 0.0, "max_marks": 10, "remarks": "..." }},
                ...
            ],
            "general_remarks": "...",
            "confidence_score": 95.0,
            "audit_trail": "Step-by-step reasoning for the grade..."
        }}
        """

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a strict academic grader."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"DeepSeek Grading Error: {e}")
            return {"error": str(e)}

    async def chat_with_context(self, context_data: str, user_query: str) -> str:
        """
        Omniscient Chatbot (Async).
        """
        system_prompt = f"""
        You are the 'PLAYBOOK AI' assistant.
        You have access to the following context data (Students, Grades, Analytics):

        [DATABASE CONTEXT]
        {context_data}
        [END CONTEXT]

        Answer the user's question accurately based on this data.
        If the answer is not in the data, say so.
        Be concise, professional, and helpful.
        """

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error connecting to AI Chat: {e}"
