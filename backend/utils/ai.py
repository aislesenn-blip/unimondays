import os
import google.generativeai as genai
from openai import OpenAI
import json
from dotenv import load_dotenv

load_dotenv(".env.local")

# Setup Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Setup DeepSeek (OpenAI compatible)
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
deepseek_client = None
if DEEPSEEK_API_KEY:
    deepseek_client = OpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url="https://api.deepseek.com"
    )

async def gemini_ocr(image_bytes: bytes) -> dict:
    """
    Uses Gemini for OCR and RegNo detection.
    Returns: {"text": str, "detected_id": bool, "reg_no": str | None}
    """
    if not GEMINI_API_KEY:
        # Fallback/Mock
        return {"text": "MOCK OCR TEXT (Key Missing)", "detected_id": True, "reg_no": "MOCK-123"}

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = """
        Extract all text from this image perfectly, including math formulas.
        Identify if there is a Student Registration Number (RegNo) visible.
        Return strictly JSON: {"text": "extracted text...", "detected_id": boolean, "reg_no": "extracted_reg_no_or_null"}
        """

        response = model.generate_content([
            {"mime_type": "image/jpeg", "data": image_bytes},
            prompt
        ])

        text = response.text
        # Clean markdown
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
             text = text.split("```")[1].split("```")[0].strip()

        data = json.loads(text)
        return data
    except Exception as e:
        print(f"Gemini Error: {e}")
        # Return mock on failure to keep flow alive in dev
        return {"text": f"OCR Failed: {str(e)}", "detected_id": False, "reg_no": None}

async def deepseek_grade(submission_text: str, rubric: str) -> dict:
    """
    Uses DeepSeek V3 for reasoning and grading.
    Returns: {"total_score": float, "breakdown": dict, "audit_log": str, "remarks": str}
    """
    if not deepseek_client:
        return {
            "total_score": 0,
            "breakdown": {},
            "audit_log": "DeepSeek Key Missing",
            "remarks": "Could not grade."
        }

    system_prompt = f"""
    You are an expert academic grader. You must grade the following student submission based strictly on the provided rubric.

    Rubric:
    {rubric}

    Output strictly in JSON format:
    {{
        "total_score": float,
        "breakdown": {{ "Q1": score, "Q2": score ... }},
        "remarks": "Personalized feedback...",
        "audit_log": "Reasoning for the marks..."
    }}
    """

    try:
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": submission_text}
            ],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"DeepSeek Error: {e}")
        return {"total_score": 0, "breakdown": {}, "remarks": "Error in grading", "audit_log": str(e)}

async def deepseek_chat(history: list, context: str) -> str:
    """
    Chat with context.
    """
    if not deepseek_client:
        return "DeepSeek not configured."

    system_prompt = f"""
    You are the PLAYBOOK AI Assistant.
    You have access to the following class data context:
    {context}

    Answer the user's question accurately based on this data.
    """

    messages = [{"role": "system", "content": system_prompt}] + history

    try:
        response = deepseek_client.chat.completions.create(
            model="deepseek-chat",
            messages=messages
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error: {e}"
