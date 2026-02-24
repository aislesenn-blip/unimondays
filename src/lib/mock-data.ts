
export const USERS = [
  {
    id: "user_1",
    name: "Dr. Sarah Manzi",
    email: "sarah.manzi@udsm.ac.tz",
    role: "LECTURER",
    institution: "University of Dar es Salaam",
    tier: "PRO",
    status: "ACTIVE",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: "user_2",
    name: "Prof. John Kito",
    email: "john.kito@ifm.ac.tz",
    role: "LECTURER",
    institution: "Institute of Finance Management",
    tier: "LITE",
    status: "LOCKED",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: "student_1",
    name: "Baraka Juma",
    regNo: "2021-04-0012",
    email: "baraka.juma@student.udsm.ac.tz",
    role: "STUDENT",
    institution: "University of Dar es Salaam",
    premium: false,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    id: "student_2",
    name: "Amina Hassan",
    regNo: "2021-04-0045",
    email: "amina.hassan@student.udsm.ac.tz",
    role: "STUDENT",
    institution: "University of Dar es Salaam",
    premium: true,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150",
  }
];

export const SESSIONS = [
  {
    id: "sess_1",
    lecturerId: "user_1",
    courseName: "Introduction to Computer Science",
    courseCode: "CS 101",
    semester: "Semester 1 2024",
    studentsCount: 145,
    worksCount: 4,
    status: "ACTIVE",
    createdAt: "2024-02-10T08:00:00Z",
  },
  {
    id: "sess_2",
    lecturerId: "user_1",
    courseName: "Data Structures & Algorithms",
    courseCode: "CS 202",
    semester: "Semester 1 2024",
    studentsCount: 89,
    worksCount: 2,
    status: "ACTIVE",
    createdAt: "2024-02-12T10:30:00Z",
  },
  {
    id: "sess_3",
    lecturerId: "user_1",
    courseName: "Software Engineering",
    courseCode: "CS 305",
    semester: "Semester 2 2023",
    studentsCount: 60,
    worksCount: 5,
    status: "ARCHIVED",
    createdAt: "2023-09-05T09:00:00Z",
  }
];

export const WORKS = [
  {
    id: "work_1",
    sessionId: "sess_1",
    title: "Mid-Semester Quiz 1",
    type: "QUIZ",
    mode: "ONLINE",
    status: "PUBLISHED",
    dueDate: "2024-03-15T23:59:00Z",
    questionsCount: 10,
    submissionsCount: 142,
    averageScore: 78.5,
  },
  {
    id: "work_2",
    sessionId: "sess_1",
    title: "Assignment 1: Python Basics",
    type: "ASSIGNMENT",
    mode: "UPLOAD",
    status: "GRADING",
    dueDate: "2024-03-20T23:59:00Z",
    questionsCount: 5,
    submissionsCount: 138,
    averageScore: 0,
  },
  {
    id: "work_3",
    sessionId: "sess_2",
    title: "Final Exam",
    type: "EXAM",
    mode: "UPLOAD",
    status: "DRAFT",
    dueDate: "2024-06-10T09:00:00Z",
    questionsCount: 4,
    submissionsCount: 0,
    averageScore: 0,
  }
];

export const SUBMISSIONS = [
  {
    id: "sub_1",
    workId: "work_1",
    studentId: "student_1",
    studentName: "Baraka Juma",
    regNo: "2021-04-0012",
    score: 85,
    maxScore: 100,
    status: "GRADED",
    submittedAt: "2024-03-15T10:00:00Z",
    breakdown: [
      { q: 1, score: 10, max: 10, feedback: "Correct." },
      { q: 2, score: 8, max: 10, feedback: "Minor syntax error." },
    ],
    aiReasoning: "The student demonstrated strong understanding of the core concepts. Question 2 had a minor syntax error in the loop structure.",
    confidence: 98,
  },
  {
    id: "sub_2",
    workId: "work_1",
    studentId: "student_2",
    studentName: "Amina Hassan",
    regNo: "2021-04-0045",
    score: 92,
    maxScore: 100,
    status: "GRADED",
    submittedAt: "2024-03-15T11:15:00Z",
    breakdown: [
      { q: 1, score: 10, max: 10, feedback: "Perfect." },
      { q: 2, score: 10, max: 10, feedback: "Excellent logic." },
    ],
    aiReasoning: "Flawless execution. Logic is sound and efficient.",
    confidence: 99,
  },
  {
    id: "sub_3",
    workId: "work_1",
    studentId: "student_3",
    studentName: "Juma Ali",
    regNo: "2021-04-0022",
    score: 45,
    maxScore: 100,
    status: "FLAGGED",
    submittedAt: "2024-03-15T12:00:00Z",
    breakdown: [
      { q: 1, score: 2, max: 10, feedback: "Incorrect approach." },
      { q: 2, score: 5, max: 10, feedback: "Partial credit." },
    ],
    aiReasoning: "Significant gaps in understanding. Recommend review of Chapter 3.",
    confidence: 85,
  }
];

export const ANALYTICS = {
  scriptsUsed: 1240,
  scriptsLimit: 5000,
  activeSessions: 4,
  pendingReviews: 12,
  averageTurnaroundTime: "1.2 hours",
  studentRiskCount: 15,
};

export const TIERS = [
  {
    name: "LITE",
    price: "Free",
    scripts: 200,
    pagesPerScript: 10,
    features: ["Basic Analytics", "Standard Support"],
    cta: "Start Free",
    recommended: false,
  },
  {
    name: "X",
    price: "TZS 50,000",
    scripts: 500,
    pagesPerScript: 15,
    features: ["Advanced Analytics", "Priority Support", "Export to Excel"],
    cta: "Upgrade",
    recommended: true,
  },
  {
    name: "PRO",
    price: "TZS 150,000",
    scripts: 5000,
    pagesPerScript: 20,
    features: ["Department License", "Dedicated Manager", "API Access"],
    cta: "Contact Sales",
    recommended: false,
  }
];

export const FAQS = [
  {
    question: "How accurate is the AI grading?",
    answer: "Our dual-AI architecture achieves 99.2% accuracy compared to human markers, with the added benefit of consistent feedback."
  },
  {
    question: "Can I edit the grades manually?",
    answer: "Yes, you have full control. You can override any grade and the system will learn from your adjustments."
  },
  {
    question: "Is student data secure?",
    answer: "Absolutely. We use enterprise-grade encryption and comply with all local data protection regulations."
  }
];
