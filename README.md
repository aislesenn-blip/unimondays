# OSPREY - University Department Management System

Osprey is a luxurious, role-based Enterprise SaaS designed for University Department management. It digitizes administrative workflows, enforces strict Role-Based Access Control (RBAC), and provides a seamless user experience across devices.

## 🚀 Features

*   **Role-Based Dashboards**: Tailored views for HOD, Secretary, Academic Staff, and Committees.
*   **Request Management**: Automated workflow for Leave, Resource, and Travel requests (Submit -> Approve/Reject).
*   **Notice Board**: Targeted announcements with Read Receipts.
*   **Digital Vault**: Secure document repository with access control.
*   **Responsive Design**: Optimized for 27-inch monitors and 6-inch mobile screens.
*   **Luxurious UI**: Deep Navy Blues, Slate Grays, Crisp Whites.

## 🛠 Tech Stack

*   **Frontend**: React (Vite), TypeScript
*   **Styling**: Tailwind CSS v4, Lucide React (Icons)
*   **State Management**: React Context (Persisted to LocalStorage)
*   **Routing**: React Router DOM

## 🔐 Mock Credentials (Login Access)

Use these credentials to test the system. Password is not enforced for this demo (click the Quick Login buttons or enter any password).

| Role | Email | Permissions |
| :--- | :--- | :--- |
| **HOD (Super Admin)** | `hod@osprey.com` | Full visibility. Approve requests, Post notices, View all stats. |
| **Secretary (Ops)** | `secretary@osprey.com` | Document management, Calendar, Draft notices. |
| **Academic Staff** | `staff@osprey.com` | Submit requests, View notices, Personal dashboard. |
| **Committee** | `committee@osprey.com` | Access restricted "Vault" documents, Committee notices. |

## 📖 How to Use

1.  **Login**: Select a role from the "Quick Login" cards or enter an email.
2.  **Dashboard**: You will be redirected to your role-specific dashboard.
3.  **Submit a Request**:
    *   Log in as **Staff** (`staff@osprey.com`).
    *   Go to **Requests** or click "New Request" on dashboard.
    *   Fill out the form.
    *   Status will be `PENDING`.
4.  **Approve a Request**:
    *   Log out and log in as **HOD** (`hod@osprey.com`).
    *   Go to **Requests** or view Pending Approvals on dashboard.
    *   Click the Checkmark (Approve) or X (Reject).
    *   Status updates instantly.
5.  **Notices & Read Receipts**:
    *   **HOD** posts a notice targeting "STAFF".
    *   **Staff** logs in, sees the notice with a "Mark as Read" button.
    *   Once clicked, HOD can see the read count increase.
6.  **Digital Vault**:
    *   Upload documents as HOD/Secretary.
    *   Mark as "Confidential" to restrict access to HOD/Secretary/Committee.
    *   Staff cannot see confidential documents.

## 📦 Installation

```bash
npm install
npm run dev
```

## 🏗 Build

```bash
npm run build
```
