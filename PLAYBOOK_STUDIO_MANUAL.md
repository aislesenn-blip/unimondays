# Playbook Studio: Official Product Manual

## 1. Value Proposition & Success Profiles

**Playbook Studio** is the "Canva of Academic Documents"—a dual-engine platform designed to automate the tedious aspects of student life. We solve two specific problems:

### The 100% Success Profiles (Who are we saving?)
*   **The Final-Year Student:** Struggling with Thesis/Dissertation formatting (margins, TOC, page numbers). Playbook PRO ensures compliance with one click.
*   **The Corporate Intern:** Needs to turn messy meeting notes into a professional PowerPoint presentation in minutes. Playbook X handles the design so they can focus on the content.
*   **The Lecturer/Teacher:** Wants to convert a syllabus or lecture notes into student handouts quickly.

---

## 2. The User Journey & Expectation Mapping

How do we guarantee 100% satisfaction? By aligning expectations at every step.

**Step 1: The Input (The Mess)**
*   The user brings a raw `.docx` or `.txt` file. Content is good, but formatting is chaotic.

**Step 2: Expectation Alignment (The Form)**
*   **Playbook PRO:** The user selects a "One-Click Preset" (e.g., Academic, Corporate). This sets the mental model: "I want this to look like a Harvard paper."
*   **Playbook X:** The user selects a Theme (e.g., Corporate Blue) and Aspect Ratio. They know exactly what visual style they will get.

**Step 3: The Engine Execution (Zero Error)**
*   **Hybrid Fallback:** Small files process instantly on the device. Large files (>2MB) are automatically routed to our secure cloud to prevent crashes.
*   **Strict Rules:** The engine applies the *exact* font, spacing, and margin rules selected. No "AI Hallucinations"—if you asked for Times New Roman, you get Times New Roman.

**Step 4: The Validation (QC Report)**
*   Before downloading, the user sees a **Quality Control (QC) Report**.
*   *Example:* "Formatted A4 Layout. Applied Times New Roman 12pt. Generated Table of Contents. 100% Ready."
*   This confirms that the system did exactly what was asked.

**Step 5: The Output (Perfection)**
*   The user downloads a file that is ready for submission. No tweaking required.

---

## 3. Core Capabilities & Limits

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

## 4. User Guide

### How to Use Playbook PRO (Document Formatter)
Choose a **"One-Click Preset"** for instant setup, or customize manually:

*   **Presets:**
    *   **Academic:** Times New Roman, 12pt, Double Spacing, APA Standard.
    *   **Corporate:** Arial, 11pt, 1.5 Spacing, Narrow Margins.
    *   **Essay:** Calibri, 12pt, Double Spacing, MLA Style.

*   **Advanced Configuration:**
    *   **Typography:** Custom Font, Size, and Spacing.
    *   **Structure:** Auto-TOC, Page Numbers.
    *   **Layout:** Margins, Orientation, Citation Style.

**Steps:**
1.  Select a Preset (or configure advanced rules).
2.  Upload your `.docx` or `.txt` file.
3.  Click "Format Document."
4.  **Review the QC Report** (Quality Control summary).
5.  Download as **.DOCX** or **.PDF**.

### How to Use Playbook X (Text-to-Slides)
To get the best results, structure your notes simply:

1.  **Configure:**
    *   **Theme:** Select from Academic, Corporate, Creative, or Dark themes.
    *   **Aspect Ratio:** 16:9 (Widescreen) or 4:3 (Standard).
    *   **Extras:** Toggle Speaker Notes, Slide Numbers, Handouts.
2.  **Write Content:**
    *   Start a Slide: Type `# Your Slide Title` and press Enter.
    *   Add Content: Type your points on new lines.
3.  **Generate:** Click "Generate Slides."
4.  **Download:** Save as **.PPTX**, **.PDF**, or **Handouts**.

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

## 5. Expected Outputs & The 100% Guarantee

We guarantee professional, standard-compliant outputs with a **Quality Control (QC) Report** for every job.

*   **Playbook PRO Output:**
    *   **Formats:** `.docx` (Word), `.pdf` (Print-Ready).
    *   **State:** Perfectly aligned margins, uniform font family and size, correct line spacing, pagination, and an optional, clickable Table of Contents.
    *   **QC Report:** Confirms page count, formatting rules applied, and image alignment fixes.

*   **Playbook X Output:**
    *   **Formats:** `.pptx` (Editable Powerpoint), `.pdf` (Presentation), Handouts.
    *   **State:** Native presentation file. **Mobile Optimized**. Editable text and slides.
    *   **Visuals:** Professional themes, master slides applied, correct aspect ratio, and speaker notes included.
    *   **Media:** Auto-fit tables and centered images (via style enforcement).
