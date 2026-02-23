from typing import List, Dict

def smart_collate(pages: List[Dict]) -> List[Dict]:
    """
    Stitches pages together based on detected Student Identity.
    Logic:
    - Scans page 1, finds Name -> Starts Dossier.
    - Scans page 2,3,4, finds no name -> Stitches to Dossier.
    - Scans page 5, finds Name -> Closes Dossier, Starts New.

    Args:
        pages: List of dicts, each containing:
            {"page_num": int, "text": str, "detected_id": bool, "reg_no": str | None}

    Returns:
        List of Dossiers:
            [{"student_id": "...", "pages": [...]}, ...]
    """
    dossiers = []
    current_dossier = None

    for page in pages:
        has_id = page.get("detected_id", False)
        reg_no = page.get("reg_no")

        if has_id:
            # If we were building a dossier, close it
            if current_dossier:
                dossiers.append(current_dossier)

            # Start new dossier
            current_dossier = {
                "student_id": reg_no if reg_no else "UNKNOWN_ID",
                "pages": [page]
            }
        else:
            # If no ID, append to current dossier
            if current_dossier:
                current_dossier["pages"].append(page)
            else:
                # Orphan page found before any ID detected (e.g., loose cover page or mixup)
                # We start an "ORPHAN" dossier.
                current_dossier = {
                    "student_id": "ORPHAN",
                    "pages": [page]
                }

    # Append the last dossier
    if current_dossier:
        dossiers.append(current_dossier)

    return dossiers
