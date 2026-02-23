# Future LMS Integration Blueprint

## Overview
To become the "Trillion-Dollar Infrastructure", Playbook must integrate seamlessly with major Learning Management Systems (LMS) like Canvas, Moodle, and Blackboard.

## Integration Strategy

### 1. LTI 1.3 Advantage (Certified Tool)
- **Standard**: Playbook will act as an LTI 1.3 Tool Provider.
- **Deep Linking**: Allows lecturers to embed Playbook quizzes directly into LMS assignments.
- **Grade Passback**: Automatically syncs graded scores back to the LMS gradebook.

### 2. API-First Design
- **Endpoints**:
  - `POST /api/lms/launch`: Handles LTI launch requests.
  - `POST /api/lms/sync-grades`: Pushes grades to LMS.
  - `GET /api/lms/roster`: Pulls student list from LMS (via Names and Role Provisioning Service).

### 3. Workflow
1.  **Lecturer**: Creates an assignment in LMS -> selects "External Tool" -> Playbook.
2.  **Student**: Clicks link in LMS -> Single Sign-On (SSO) into Playbook -> Takes Quiz.
3.  **Playbook**: Grades submission via AI.
4.  **Sync**: Playbook calls LMS Gradebook Service API to update the score.

## Implementation Steps
1.  **Auth**: Implement OIDC flow for secure launch.
2.  **LTI Library**: Use `lti-node` or build custom middleware for LTI 1.3.
3.  **Database**: Add `LmsConfig` table (Client ID, Deployment ID, Private Key).
4.  **UI**: Add "LMS Settings" page for lecturers to configure integration keys.
