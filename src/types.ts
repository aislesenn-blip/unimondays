export type Role = 'HOD' | 'SECRETARY' | 'STAFF' | 'COMMITTEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  avatar?: string;
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Request {
  id: string;
  type: 'LEAVE' | 'RESOURCE' | 'TRAVEL' | 'OTHER';
  title: string;
  description: string;
  requesterId: string;
  requesterName: string;
  status: RequestStatus;
  date: string;
  comments?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  date: string;
  targetRoles: Role[]; // Who can see this
  readBy: string[]; // List of user IDs who read it
}

export interface Document {
  id: string;
  title: string;
  category: 'MINUTES' | 'POLICY' | 'SYLLABUS' | 'EXAM' | 'OTHER';
  uploadedBy: string;
  uploadDate: string;
  url: string; // Mock URL
  accessLevel: Role[]; // Roles that can access
}
