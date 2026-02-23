from .gemini import GeminiService
from pypdf import PdfReader, PdfWriter
from io import BytesIO
import tempfile
import os

class ScriptCollator:
    def __init__(self, gemini_service: GeminiService):
        self.gemini = gemini_service
        self.scripts = [] # List of { "student_id": "...", "pages": [page_index], "text": "..." }

    async def collate_scripts(self, pdf_bytes: bytes):
        """
        Processes a multi-page PDF and splits it into student scripts.
        """
        reader = PdfReader(BytesIO(pdf_bytes))
        num_pages = len(reader.pages)

        current_student_id = "UNKNOWN_START"
        current_script_pages = []
        current_script_text = ""

        scripts = []

        # Iterate through all pages
        for i in range(num_pages):
            # Extract page as single-page PDF bytes for upload
            writer = PdfWriter()
            writer.add_page(reader.pages[i])

            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                writer.write(tmp)
                tmp_path = tmp.name

            # Call Gemini for OCR and ID detection on this page
            # We use extract_data_from_file which handles upload
            result = await self.gemini.extract_data_from_file(tmp_path, "application/pdf")

            os.unlink(tmp_path) # Cleanup temp file

            # Logic: If ID detected, it's a new script (unless it's the first page of current script,
            # but we assume ID appears once at start. Or maybe on every page?
            # Prompt says: "Gemini scans Page 1, finds Name... Scans Page 2, 3, 4, finds no names... Scans Page 5, finds Name... closes Dossier".

            is_new_student = False
            detected_id = result.get("detected_id", False)
            student_id = result.get("reg_no") or result.get("student_name")

            if detected_id and student_id:
                # Check if it's different from current (or if we are just starting)
                # If current_student_id is UNKNOWN_START, we adopt this ID.
                # If current_student_id is set, and we find a NEW ID, we switch.

                if current_student_id == "UNKNOWN_START":
                    current_student_id = student_id
                    current_script_pages.append(i)
                    current_script_text += result.get("text", "") + "\n"
                elif student_id != current_student_id:
                    # New student found! Close previous script.
                    scripts.append({
                        "student_id": current_student_id,
                        "pages": current_script_pages,
                        "text": current_script_text
                    })
                    # Start new
                    current_student_id = student_id
                    current_script_pages = [i]
                    current_script_text = result.get("text", "") + "\n"
                else:
                    # Same student ID found again (maybe on page 2). Append.
                    current_script_pages.append(i)
                    current_script_text += result.get("text", "") + "\n"
            else:
                # No ID found. Append to current script.
                current_script_pages.append(i)
                current_script_text += result.get("text", "") + "\n"

        # Add the last script
        if current_script_pages:
            scripts.append({
                "student_id": current_student_id,
                "pages": current_script_pages,
                "text": current_script_text
            })

        return scripts
