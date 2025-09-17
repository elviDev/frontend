import { User } from "./auth";

export interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  members: ProjectMember[];
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
}

export interface ProjectMember {
  id: string;
  user: User;
  role: 'lead' | 'member';
  joinedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: User;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  dueDate: Date;
  createdAt: Date;
}

export interface Channel {
  id: string;
  title: string;
  description: string;
  category: string;
  members: User[];
  projectId: string;
  createdAt: Date;
}