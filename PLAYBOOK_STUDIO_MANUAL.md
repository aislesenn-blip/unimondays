# Playbook Studio: Official Product Manual

## 1. Value Proposition

**Playbook Studio** is the "Canva of Academic Documents"—a dual-engine platform designed to automate the tedious aspects of student life. We solve two specific problems:

### For Playbook PRO (The Document Formatter):
*   **The Problem:** Students spend hours fixing margins, fonts, line spacing, and Tables of Contents (TOC) to meet university standards.
*   **The Solution:** An automated formatting engine. Upload a messy draft, and get a perfectly formatted, submission-ready document in seconds.

### For Playbook X (The Presentation Engine):
*   **The Problem:** Creating presentation slides requires design skills, alignment, and time-consuming copy-pasting.
*   **The Solution:** "Write once. Present instantly." A text-to-presentation engine where students focus purely on content, and the system handles all design, layout, and slide creation automatically.

---

## 2. Core Capabilities & Limits

Playbook Studio operates on a **Hybrid Architecture** to ensure speed, privacy, and stability.

### A. The Web Worker (Offline Mode)
*   **Standard Operation:** For most documents (under 2MB), all processing happens **locally on your device**.
*   **Benefits:** Zero latency, 100% data privacy (files never leave the phone), and works offline.
*   **Playbook X:** Fully client-side using `pptxgenjs`.

### B. The Hybrid Fallback (Cloud Mode)
*   **Heavy Duty Operation:** If a document exceeds **2MB**, the system automatically detects the load risk.
*   **Crash Prevention:** To prevent low-end mobile devices from crashing (Out-Of-Memory errors), large files are routed to our secure **Serverless Backend**.
*   **Capability:** The backend extracts the content and rebuilds the document from scratch, applying all your selected formatting rules (Font, Spacing, TOC) with server-grade power, then returns the file instantly.

### C. Playbook X "Smart Simplification Layer"
We use a deterministic rule-based engine to turn text into slides. There is no "AI Hallucination." It follows strict logic:
1.  **Heading Rule:** Any line starting with `#` or detected as a Title becomes a **New Slide**.
2.  **3-Line Rule:** Paragraphs longer than ~200 characters are automatically split into bullet points for readability.
3.  **Overflow Rule:** If a slide has more than 8 bullet points, it automatically splits into a second slide (e.g., "Introduction (cont.)").
4.  **Column Rule:** If a slide has between 5-8 bullet points, the layout automatically switches to **Two Columns** to maximize space.

---

## 3. User Guide

### How to Use Playbook X (Text-to-Slides)
To get the best results, structure your notes simply:

1.  **Start a Slide:** Type `# Your Slide Title` and press Enter.
2.  **Add Content:** Type your points on new lines.
    *   *Short lines* become bullet points.
    *   *Long paragraphs* are auto-summarized into bullets.
3.  **Repeat:** Type `# Next Slide Title` to start a new slide.

**Example Input:**
```markdown
# The History of Mining
Mining began in the Stone Age.
Early humans dug for flint.

# Modern Techniques
Open-pit mining is common.
Underground mining reaches deep deposits.
Automation is changing the industry.
```

### How to Use Playbook PRO
1.  **Select Your Settings:** Choose your preferred Font (Arial/Times), Spacing (1.5/2.0), and toggle Auto-TOC.
2.  **Upload:** Drop your `.docx` or `.txt` file.
3.  **Format:** Click "Format Document."
    *   *Small files* process instantly on your phone.
    *   *Large files* will prompt you to "Route to Secure Cloud" for stability.
4.  **Download:** Get your clean `.docx` file immediately.

---

## 4. Expected Outputs

We guarantee professional, standard-compliant outputs.

*   **Playbook PRO Output:**
    *   **Format:** `.docx` (Microsoft Word compatible).
    *   **State:** Perfectly aligned margins, uniform font (Times New Roman or Arial), correct line spacing (1.0, 1.5, or 2.0), and an optional, clickable Table of Contents.

*   **Playbook X Output:**
    *   **Format:** `.pptx` (PowerPoint / WPS Office compatible).
    *   **State:** Native presentation file. **Mobile Optimized** (MIME type fixed to open directly in apps, not as a ZIP). Editable text and slides.
    *   **Visuals:** Clean, professional themes (Academic White, Corporate Blue, Minimalist Dark).
