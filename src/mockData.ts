import type { User, Request, Notice, Document } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Dr. Ernest (HOD)',
    email: 'hod@osprey.com',
    role: 'HOD',
    department: 'Computer Science',
    avatar: 'https://i.pravatar.cc/150?u=hod',
  },
  {
    id: 'u2',
    name: 'Ms. Sarah (Secretary)',
    email: 'secretary@osprey.com',
    role: 'SECRETARY',
    department: 'Computer Science',
    avatar: 'https://i.pravatar.cc/150?u=sec',
  },
  {
    id: 'u3',
    name: 'Dr. Jules (Lecturer)',
    email: 'staff@osprey.com',
    role: 'STAFF',
    department: 'Computer Science',
    avatar: 'https://i.pravatar.cc/150?u=staff',
  },
  {
    id: 'u4',
    name: 'Exam Committee',
    email: 'committee@osprey.com',
    role: 'COMMITTEE',
    department: 'Computer Science',
    avatar: 'https://i.pravatar.cc/150?u=comm',
  },
];

export const INITIAL_REQUESTS: Request[] = [
  {
    id: 'r1',
    type: 'LEAVE',
    title: 'Medical Leave Request',
    description: 'Requesting 3 days leave for medical checkup.',
    requesterId: 'u3',
    requesterName: 'Dr. Jules (Lecturer)',
    status: 'PENDING',
    date: '2023-10-25',
  },
  {
    id: 'r2',
    type: 'RESOURCE',
    title: 'New Projector for Lab 3',
    description: 'The current projector is flickering.',
    requesterId: 'u3',
    requesterName: 'Dr. Jules (Lecturer)',
    status: 'APPROVED',
    date: '2023-10-20',
    comments: 'Approved. Order placed via Secretary.',
  },
  {
    id: 'r3',
    type: 'TRAVEL',
    title: 'Conference in Nairobi',
    description: 'AI in Education Conference participation.',
    requesterId: 'u1', // Self-request? Or maybe HOD requests to Dean (out of scope). Let's say HOD requests resource.
    requesterName: 'Dr. Ernest (HOD)',
    status: 'PENDING',
    date: '2023-10-26',
  }
];

export const INITIAL_NOTICES: Notice[] = [
  {
    id: 'n1',
    title: 'Department Meeting on Friday',
    content: 'All academic staff are required to attend the monthly meeting at 10 AM.',
    authorId: 'u1',
    authorName: 'Dr. Ernest (HOD)',
    date: '2023-10-24',
    targetRoles: ['HOD', 'SECRETARY', 'STAFF', 'COMMITTEE'],
    readBy: ['u2'],
  },
  {
    id: 'n2',
    title: 'Exam Paper Submission Deadline',
    content: 'Please submit final drafts by Monday.',
    authorId: 'u4',
    authorName: 'Exam Committee',
    date: '2023-10-25',
    targetRoles: ['HOD', 'STAFF'], // Only relevant roles
    readBy: [],
  },
  {
    id: 'n3',
    title: 'Confidential: Budget Review',
    content: 'Attached is the preliminary budget for Q4.',
    authorId: 'u1',
    authorName: 'Dr. Ernest (HOD)',
    date: '2023-10-26',
    targetRoles: ['HOD', 'SECRETARY'],
    readBy: [],
  }
];

export const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'd1',
    title: 'Department Policy 2024',
    category: 'POLICY',
    uploadedBy: 'u2',
    uploadDate: '2023-09-01',
    url: '#',
    accessLevel: ['HOD', 'SECRETARY', 'STAFF', 'COMMITTEE'],
  },
  {
    id: 'd2',
    title: 'CS101 Syllabus',
    category: 'SYLLABUS',
    uploadedBy: 'u3',
    uploadDate: '2023-09-15',
    url: '#',
    accessLevel: ['HOD', 'STAFF', 'SECRETARY'],
  },
  {
    id: 'd3',
    title: 'Final Exam CS101 (Draft)',
    category: 'EXAM',
    uploadedBy: 'u3',
    uploadDate: '2023-10-20',
    url: '#',
    accessLevel: ['HOD', 'COMMITTEE'], // Restricted
  }
];
