def validate_submission_content(text: str) -> dict:
    """
    Validates if the submission is a valid academic script.

    Returns:
        {"valid": bool, "reason": str | None}
    """
    INVALID_KEYWORDS = [
        "national identification authority",
        "nida",
        "birth certificate",
        "passport",
        "driver's license",
        "tanzania revenue authority",
        "immigration services"
    ]

    text_lower = text.lower()

    for keyword in INVALID_KEYWORDS:
        if keyword in text_lower:
            return {
                "valid": False,
                "reason": f"SYSTEM HALT: Invalid Document Detected ({keyword.upper()})"
            }

    # Check for sufficient content length (e.g., extremely short text might be garbage)
    if len(text.split()) < 5:
         return {
            "valid": False,
            "reason": "SYSTEM HALT: Insufficient Content (Too short)"
        }

    return {"valid": True, "reason": None}
