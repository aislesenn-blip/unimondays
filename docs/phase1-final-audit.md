# Playbook Ecosystem - Phase 1 Final UI Audit & System Mapping

## 1. System Entry Point

### Landing Page (`/`)
- **Visuals**: Hero section, Features, Tiers, Footer.
- **Navigation**: Home, Outcomes, Students, Partners, FAQ, Privacy.
- **Entry Points**: "Start as Lecturer" (Signup), "Student Access" (Login).
- **UX**: Clean, institutional tone. No clutter.

### Authentication
- **Lecturer**: Login (`/login`) & Signup (`/signup`) with Institution field.
- **Onboarding**: Tier selection modal (`/onboarding`) with simulated "Account Locked" verification state.
- **Student**: Simple Login (`/student/login`) with Registration Number.

---

## 2. Dashboard & Navigation

### Global Navigation
- **Hamburger Menu**: Fully collapsible sidebar (Desktop) / Slide-in Drawer (Mobile).
- **Sections**: Home, Sessions, Analytics, Appeals, Exports, Settings.
- **Back Navigation**: `<ArrowLeft>` button integrated into deep page headers.
- **AI Assistant**: Floating action button (`GlobalAIAssistant`) present on all authenticated pages.

### Dashboard Home (`/dashboard`)
- **Widgets**: Clickable cards for Pending Reviews, Active Sessions, Risk Students, Scripts Graded.
- **Flow**: Clicking "Active Sessions" -> `/dashboard/sessions`. Clicking "Pending" -> `/dashboard/sessions?filter=pending`.
- **Usage Meter**: Visual progress bar for script limits (Tier aware) in sidebar.

---

## 3. Session & Work Management

### Session Management
- **List View**: `/dashboard/sessions` (Grid of active/archived sessions).
- **Create Session**: `/dashboard/sessions/create` (Form with Online/Offline mode toggle).
- **Details View**: `/dashboard/sessions/[id]` with Tabs:
    - **Overview**: Stats cards.
    - **Works**: List of assessments.
    - **Students**: Enrollment table.
    - **Groups**: Group management interface.
    - **Continuous Assessment**: Student progress tracker.
    - **Analytics**: Performance graphs.

### Work Creation Flow
- **Dual Mode**:
    - **Upload Mode**: Drag & drop area for PDF/Scanned scripts.
    - **Digital Mode**: Rich text editor for instructions, Question builder.
- **Group Work**: Toggle for group assignments, shared vs unique documents.
- **Calibration**: Settings for timer, auto-release, strictness.

### Offline Workflow Integration
- **Indicator**: "Offline / Scanned" badge in Work Details.
- **Bulk Upload**: Dedicated "Bulk Script Upload" card for offline works.
- **Auto-Mapping**: Visual status card showing "Matched 142/145 scripts".

---

## 4. Marking & Results Control

### Work Details (`/dashboard/sessions/[id]/work/[workId]`)
- **Result Control Panel**: Manage release mode (Manual/Auto), Scheme visibility, Locking, Appeals.
- **Submission Table**: List of students with Status (Graded/Flagged) and Score.
- **Bulk Actions**: Floating bar appears when rows selected (Re-evaluate, Export, Announce).
- **Audit Trail**: Eye icon triggers slide-out sheet with detailed AI reasoning per question.

### Grading Interface (`.../grade/[studentId]`)
- **Split View**: Script preview (left) + Grading Panel (right).
- **AI Analysis**: Confidence score and reasoning summary.
- **Navigation**: Next/Prev student buttons.

---

## 5. Student Portal

### Dashboard (`/student/dashboard`)
- **Code Input**: Join session via code.
- **Active Works**: List of pending assignments.
- **Past Results**: Grade history.
- **Upsell**: Premium features card.

### Assessment (`/student/assessment/[code]`)
- **Exam UI**: Timer, Questions (Text/Radio), File Upload.
- **Submission**: Mock success state.

---

## 6. Phase 1 Checklist Verification

- [x] Landing page with features, tiers, student entry.
- [x] Lecturer onboarding with tier selection.
- [x] Dashboard: Pending / Active / Risk cards (Clickable).
- [x] Hamburger navigation (desktop + mobile).
- [x] Session creation with Online / Offline toggle.
- [x] Work creation: Upload scanned scripts, digital mode, group work.
- [x] Result release control panel inside each Work.
- [x] Audit Trail Viewer modal for AI reasoning.
- [x] Bulk Actions Panel for marking operations.
- [x] Global AI Assistant floating button.
- [x] Student portal mock (Dashboard + Assessment).
- [x] Back buttons on all deep pages.
- [x] Mock database wiring (via `src/lib/mock-data.ts`).
- [x] Offline uploaded scripts workflow (Mock Bulk Upload & Auto-Mapping).
- [x] Continuous assessment overview panel (Calibration & Max Points).
- [x] Responsive layout + mobile friendliness.

## 7. Usability Self-Assessment
The system successfully mimics a production environment.
- **Navigation**: Intuitive flow from Dashboard -> Session -> Work.
- **Clarity**: "Offline Mode" and "Continuous Assessment" are clearly visualized.
- **Power**: Advanced controls (Calibration, Result Release) are accessible but not overwhelming.
- **Feedback**: Mock loading states and toast-like interactions (e.g. Bulk Actions) provide system feedback.

**Verdict**: Phase 1 UI is complete, robust, and ready for backend integration.
