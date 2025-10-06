export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
export type TaskType = 'general' | 'project' | 'maintenance' | 'emergency' | 'research' | 'approval';
export type TaskCategory = 'general' | 'project' | 'maintenance' | 'emergency' | 'research' | 'approval';

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: string;
  phone?: string;
}

export interface TaskComment {
  id: string;
  content: string;
  author: TaskAssignee;
  timestamp: Date;
  attachments?: TaskAttachment[];
  reactions?: {
    thumbs_up: number;
    thumbs_down: number;
  };
  userReactions?: {
    [userId: string]: ('thumbs_up' | 'thumbs_down')[];
  };
  // API response fields
  task_id?: string;
  author_id?: string;
  author_name?: string;
  author_email?: string;
  is_edited?: boolean;
  edited_at?: string;
  edited_by?: string;
  edited_by_name?: string;
  parent_comment_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  up_count?: string;
  down_count?: string;
  total_reactions?: string;
  user_reaction?: 'up' | 'down' | 'thumbs_up' | 'thumbs_down' | null;
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
  parent_task_id?: string; // Backend field for subtasks
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
  acceptance_criteria?: string; // Backend field
  story_points?: number; // Backend field
  // Computed fields from backend joins
  assignee_details?: TaskAssignee[];
  owner_name?: string;
  channel_name?: string;
  subtask_count?: number;
  dependency_count?: number;
  comments_count: number;
  attachments_count: number;
  last_activity_at: Date | string;
  version?: number; // Backend versioning field
  // Frontend-only fields for compatibility
  subtasks: TaskSubtask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  dependencies: string[];
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  task_type?: TaskType[];
  assigned_to?: string[];
  assignee?: string[]; // Alias for assigned_to for legacy support
  channel_id?: string;
  channel?: string[]; // Alias for channel_id
  due_after?: Date;
  due_before?: Date;
  dueDate?: { from?: Date; to?: Date }; // Alternative date filter format
  tags?: string[];
  voice_created?: boolean;
  voiceCreated?: boolean; // Alias for voice_created
  overdue?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
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
  channel_id: string; // Required - every task must belong to a channel
  parent_task_id?: string;
  assigned_to?: string[];
  owned_by?: string;
  priority?: TaskPriority;
  task_type?: TaskType;
  complexity?: number;
  estimated_hours?: number;
  due_date?: Date | string;
  start_date?: Date | string;
  tags?: string[];
  labels?: Record<string, any>;
  voice_created?: boolean;
  voice_command_id?: string;
  voice_instructions?: string;
  business_value?: 'low' | 'medium' | 'high' | 'critical';
  acceptance_criteria?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  task_type?: TaskType;
  assigned_to?: string[];
  channel_id?: string;
  tags?: string[];
  due_date?: Date | string;
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage?: number;
  complexity?: number;
  business_value?: 'low' | 'medium' | 'high' | 'critical';
  acceptance_criteria?: string;
}
