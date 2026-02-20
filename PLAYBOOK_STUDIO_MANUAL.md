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
*   **Capability:** The backend extracts the content and rebuilds the document from scratch, **strictly applying all your selected configuration options** (Margins, Font Size, Citation Style, etc.) with server-grade power.

### C. Playbook X "Smart Simplification Layer"
We use a deterministic rule-based engine to turn text into slides. There is no "AI Hallucination." It follows strict logic:
1.  **Heading Rule:** Any line starting with `#` or detected as a Title becomes a **New Slide**.
2.  **3-Line Rule:** Paragraphs longer than ~200 characters are automatically split into bullet points for readability.
3.  **Overflow Rule:** If a slide has more than 8 bullet points, it automatically splits into a second slide (e.g., "Introduction (cont.)").
4.  **Column Rule:** If a slide has between 5-8 bullet points, the layout automatically switches to **Two Columns** to maximize space.

---

## 3. User Guide

### How to Use Playbook PRO (Document Formatter)
You have full control over the output. Configure the settings before formatting:

*   **Typography:**
    *   **Font Family:** Choose between *Times New Roman* (Academic Standard), *Arial* (Clean), or *Calibri* (Modern).
    *   **Size:** 10pt, 11pt, or 12pt (Standard).
    *   **Spacing:** Single (1.0), Standard (1.5), or Double (2.0).
*   **Structure:**
    *   **Auto-TOC:** Toggle to automatically generate a clickable Table of Contents.
    *   **Page Numbers:** Toggle to add page numbers in the footer.
*   **Advanced:**
    *   **Margins:** Normal (1"), Narrow (0.5"), or Wide (2" sides).
    *   **Citation Style:** Select APA, MLA, Harvard, or Chicago style headers.
    *   **Orientation:** Portrait or Landscape.

**Steps:**
1.  Set your rules.
2.  Upload your `.docx` or `.txt` file.
3.  Click "Format Document."
4.  Download the professional result.

### How to Use Playbook X (Text-to-Slides)
To get the best results, structure your notes simply:

1.  **Configure:**
    *   **Theme:** Select from Academic, Corporate, Creative, or Dark themes.
    *   **Aspect Ratio:** 16:9 (Widescreen) or 4:3 (Standard).
    *   **Extras:** Toggle Speaker Notes or Slide Numbers.
2.  **Write Content:**
    *   Start a Slide: Type `# Your Slide Title` and press Enter.
    *   Add Content: Type your points on new lines.
3.  **Generate:** Click "Generate Slides" to get a `.pptx` file.

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

---

## 4. Expected Outputs

We guarantee professional, standard-compliant outputs.

*   **Playbook PRO Output:**
    *   **Format:** `.docx` (Microsoft Word compatible).
    *   **State:** Perfectly aligned margins, specified font family and size, correct line spacing, pagination, and an optional, clickable Table of Contents.

*   **Playbook X Output:**
    *   **Format:** `.pptx` (PowerPoint / WPS Office compatible).
    *   **State:** Native presentation file. **Mobile Optimized**. Editable text and slides.
    *   **Visuals:** Professional themes, master slides applied, correct aspect ratio, and speaker notes included.
