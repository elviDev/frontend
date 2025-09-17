export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
export type TaskType = 'general' | 'project' | 'maintenance' | 'emergency' | 'research' | 'approval';
export type TaskCategory = 'general' | 'project' | 'maintenance' | 'emergency' | 'research' | 'approval';

export interface TaskAssignee {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email: string;
}

export interface TaskComment {
  id: string;
  content: string;
  author: TaskAssignee;
  timestamp: Date;
  attachments?: TaskAttachment[];
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video' | 'audio';
  url: string;
  size: number;
  uploadedBy: TaskAssignee;
  uploadedAt: Date;
}

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: TaskAssignee;
  dueDate?: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  task_type: TaskType;
  channel_id?: string;
  channel_name?: string;
  assigned_to: string[];
  created_by: string;
  owned_by?: string;
  tags: string[];
  due_date?: Date | string;
  start_date?: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
  completed_at?: Date | string;
  estimated_hours?: number;
  actual_hours: number;
  progress_percentage: number;
  complexity: number;
  watchers: string[];
  voice_created: boolean;
  voice_command_id?: string;
  voice_instructions?: string;
  business_value: 'low' | 'medium' | 'high' | 'critical';
  labels: Record<string, any>;
  custom_fields: Record<string, any>;
  // Legacy fields for compatibility
  assignees?: TaskAssignee[];
  reporter?: TaskAssignee;
  channelId?: string;
  channelName?: string;
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  progress?: number;
  category?: string;
  subtasks: TaskSubtask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  dependencies: string[];
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  task_type?: TaskType[];
  assignedTo?: string[];
  channelId?: string;
  dueAfter?: Date;
  dueBefore?: Date;
  tags?: string[];
  voiceCreated?: boolean;
  overdue?: boolean;
  // Legacy fields for compatibility
  category?: string[];
  assignee?: string[];
  channel?: string[];
  dueDate?: {
    from?: Date;
    to?: Date;
  };
}

export interface TaskSort {
  field: 'due_date' | 'priority' | 'status' | 'created_at' | 'updated_at' | 'title';
  direction: 'asc' | 'desc';
}

export interface TaskStats {
  totalTasks: number;
  tasksByStatus: {
    pending: number;
    in_progress: number;
    review: number;
    completed: number;
    cancelled: number;
    on_hold: number;
  };
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
    critical: number;
  };
  overdueTasks: number;
  completedThisWeek: number;
  averageCompletionTime: number;
  // Legacy fields for compatibility
  total?: number;
  pending?: number;
  inProgress?: number;
  completed?: number;
  overdue?: number;
  dueSoon?: number;
  unassigned?: number;
}

export interface BoardColumn {
  id: string;
  title: string;
  status: TaskStatus;
  tasks: Task[];
  color: string;
}

export interface TaskActivity {
  id: string;
  type: 'created' | 'updated' | 'commented' | 'assigned' | 'status_changed' | 'due_date_changed';
  description: string;
  user: TaskAssignee;
  timestamp: Date;
  taskId: string;
  metadata?: any;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  channel_id?: string;
  created_by: string;
  assigned_to?: string[];
  owned_by?: string;
  priority?: TaskPriority;
  task_type?: TaskType;
  complexity?: number;
  estimated_hours?: number;
  due_date?: Date;
  start_date?: Date;
  tags?: string[];
  labels?: Record<string, any>;
  voice_created?: boolean;
  voice_command_id?: string;
  voice_instructions?: string;
  business_value?: 'low' | 'medium' | 'high' | 'critical';
  acceptance_criteria?: string;
  // Legacy fields for compatibility
  priority_legacy?: TaskPriority;
  category?: string;
  assignees?: string[];
  channelId?: string;
  dueDate?: Date;
  estimatedHours?: number;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  assignees?: string[];
  channelId?: string;
  tags?: string[];
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  progress?: number;
}
