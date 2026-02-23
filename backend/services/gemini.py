import google.generativeai as genai
import json
import os
import tempfile
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment")

genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-1.5-flash"

class GeminiService:
    def __init__(self):
        self.model = genai.GenerativeModel(MODEL_NAME)

    async def extract_data_from_file(self, file_path: str, mime_type: str):
        """
        Uploads a file (Image/PDF) to Gemini and extracts text + metadata.
        """
        try:
            # Upload the file
            uploaded_file = genai.upload_file(file_path, mime_type=mime_type)

            prompt = """
            You are a high-accuracy OCR engine for student scripts.
            1. Extract ALL text from this document, including handwritten text and math formulas.
            2. Look for a Student Name or Registration Number (e.g., Reg No, Student ID, NIDA, Name).
            3. Return a valid JSON object ONLY, with this structure:
            {
                "text": "Full extracted text content...",
                "detected_id": true/false,
                "reg_no": "Extracted ID or null if not found",
                "student_name": "Extracted Name or null if not found",
                "is_garbage": true/false (Set to true if document is NOT a student script, e.g. ID card, newspaper)
            }
            Do not wrap in markdown code blocks. Just the raw JSON string.
            """

            response = await self.model.generate_content_async(
                [uploaded_file, prompt]
            )

            text = response.text.strip()
            # Clean up potential markdown formatting
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]

            # Clean up potential "```" if it's just raw code block
            text = text.strip("`")

            return json.loads(text)

        except Exception as e:
            print(f"Gemini OCR Error: {e}")
            return {
                "text": "",
                "detected_id": False,
                "reg_no": None,
                "student_name": None,
                "is_garbage": False,
                "error": str(e)
            }
