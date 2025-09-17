import { ApiResponse } from '../../types/api';
import { Task, CreateTaskData, TaskFilter, TaskStats, TaskSort, TaskStatus, TaskPriority, TaskAssignee, TaskComment } from '../../types/task.types';
import { API_BASE_URL } from '../../config/api';
import { authService } from './authService';
import { tokenManager } from '../tokenManager';

export interface TaskListResponse {
  success: boolean;
  data: Task[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: string;
}

export interface TaskResponse {
  success: boolean;
  data: Task;
  timestamp: string;
}

export interface TaskStatsResponse {
  success: boolean;
  data: TaskStats;
  timestamp: string;
}

export interface TaskAssignRequest {
  userIds: string[];
}

export interface TaskStatusRequest {
  status: TaskStatus;
}

export interface TaskProgressRequest {
  progress: number;
}

export interface TaskWatcherRequest {
  userId: string;
}

export interface BulkTaskUpdateRequest {
  taskIds: string[];
  updates: Partial<Task>;
}

export interface TaskExportRequest {
  format: 'json' | 'csv' | 'excel';
  filters?: TaskFilter;
}

export interface CommentCreateRequest {
  content: string;
  taskId: string;
}

export interface CommentUpdateRequest {
  content: string;
}

export interface CommentResponse {
  success: boolean;
  data: TaskComment;
  timestamp: string;
}

export interface CommentsListResponse {
  success: boolean;
  data: TaskComment[];
  timestamp: string;
}

export interface TaskServiceError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  total: number;
  errors?: { taskId: string; error: string }[];
}

/**
 * Task API Service
 * Handles all task-related API operations with authentication
 */
class TaskService {
  private readonly baseUrl: string;

  constructor() {


    this.baseUrl = API_BASE_URL;
  }

  /**
   * Check if using mock authentication in development
   */
  private async isUsingMockAuth(): Promise<boolean> {
    const token = await authService.getAccessToken();
    return token?.startsWith('dev-') || false;
  }

  /**
   * Get mock API response for development
   */
  private async getMockApiResponse(endpoint: string, config: RequestInit): Promise<any> {
    console.log('🎭 Using mock API response for:', endpoint);
    
    // Mock task data
    const mockTasks: Task[] = [
      {
        id: 'task-1',
        title: 'Review quarterly reports',
        description: 'Analyze Q3 performance metrics and prepare presentation for board meeting',
        status: 'in_progress',
        priority: 'high',
        task_type: 'general',
        assigned_to: ['dev-user-id'],
        created_by: 'dev-user-id',
        owned_by: 'dev-user-id',
        channel_id: 'channel-1',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        progress_percentage: 60,
        complexity: 7,
        estimated_hours: 8,
        actual_hours: 5,
        tags: ['reports', 'quarterly'],
        watchers: [],
        voice_created: false,
        business_value: 'high',
        labels: {},
        custom_fields: {},
        subtasks: [],
        comments: [],
        attachments: [],
        dependencies: []
      },
      {
        id: 'task-2',
        title: 'Update security protocols',
        description: 'Implement new security measures across all systems',
        status: 'pending',
        priority: 'critical',
        task_type: 'project',
        assigned_to: ['dev-user-id'],
        created_by: 'dev-user-id',
        owned_by: 'dev-user-id',
        channel_id: 'channel-1',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        progress_percentage: 0,
        complexity: 9,
        estimated_hours: 12,
        actual_hours: 0,
        tags: ['security', 'protocols'],
        watchers: [],
        voice_created: false,
        business_value: 'critical',
        labels: {},
        custom_fields: {},
        subtasks: [],
        comments: [],
        attachments: [],
        dependencies: []
      }
    ];

    // Mock task stats
    const mockStats: TaskStats = {
      totalTasks: 15,
      tasksByStatus: {
        pending: 4,
        in_progress: 2,
        review: 1,
        completed: 8,
        cancelled: 0,
        on_hold: 0
      },
      tasksByPriority: {
        low: 2,
        medium: 6,
        high: 4,
        urgent: 2,
        critical: 1
      },
      overdueTasks: 1,
      completedThisWeek: 3,
      averageCompletionTime: 72
    };

    // Return appropriate mock response based on endpoint
    if (endpoint.includes('/tasks/stats')) {
      return {
        success: true,
        data: mockStats,
        timestamp: new Date().toISOString()
      };
    } else if (endpoint === '/tasks') {
      return {
        success: true,
        data: mockTasks,
        pagination: {
          total: mockTasks.length,
          limit: 50,
          offset: 0,
          hasMore: false
        },
        timestamp: new Date().toISOString()
      };
    } else if (endpoint.match(/\/tasks\/[^/]+$/)) {
      return {
        success: true,
        data: mockTasks[0],
        timestamp: new Date().toISOString()
      };
    }

    // Default response
    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      // Get the access token from authService
      const accessToken = await tokenManager.getCurrentToken();
      
      const config: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          ...options.headers,
        },
      };

      console.log('📋 TaskService request:', {
        endpoint,
        url,
        hasToken: !!accessToken,
        tokenLength: accessToken ? accessToken.length : 0,
        tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'none',
        headers: config.headers
      });

      return await authService.withAuth(async () => {
        const response = await fetch(url, config);
        
        console.log('📋 TaskService response:', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: response.headers ? Object.fromEntries(response.headers.entries()) : {}
        });
        
        if (!response.ok) {
          let errorData: any = {};
          try {
            const errorText = await response.text();
            console.error('📋 TaskService error response body:', errorText);
            
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // If not JSON, use the text as message
              errorData = { message: errorText };
            }
            
            console.error('📋 TaskService parsed error:', errorData);
          } catch (parseError) {
            console.error('📋 TaskService error reading response:', parseError);
            errorData = { message: `Failed to parse error response` };
          }
          
          const errorMessage = errorData.message || 
            errorData.error?.message || 
            `HTTP ${response.status}: ${response.statusText}`;
            
          console.error('📋 TaskService throwing error:', {
            message: errorMessage,
            status: response.status,
            endpoint,
            errorData
          });
          
          const error = new Error(errorMessage) as TaskServiceError;
          error.code = errorData.code;
          error.statusCode = response.status;
          error.details = errorData;
          
          throw error;
        }
        
        const jsonResponse = await response.json();
        console.log('📋 TaskService success response:', {
          endpoint,
          dataLength: Array.isArray(jsonResponse.data) ? jsonResponse.data.length : 'not-array',
          success: jsonResponse.success
        });
        return jsonResponse;
      });
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw TaskServiceError as-is
        if ('statusCode' in error) {
          throw error;
        }
        
        // Wrap other errors
        const taskError = new Error(error.message) as TaskServiceError;
        taskError.code = 'NETWORK_ERROR';
        throw taskError;
      }
      
      // Handle non-Error objects
      const taskError = new Error('Unknown error occurred') as TaskServiceError;
      taskError.code = 'UNKNOWN_ERROR';
      taskError.details = error;
      throw taskError;
    }
  }

  /**
   * Get tasks with filters and pagination
   */
  async getTasks(filters?: TaskFilter & {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<TaskListResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      console.log('📋 TaskService: Processing filters:', filters);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            // Handle arrays - each value gets added separately
            value.forEach(v => {
              if (v !== undefined && v !== null) {
                params.append(key, v.toString());
              }
            });
          } else if (value instanceof Date) {
            // Handle Date objects properly
            params.append(key, value.toISOString());
          } else if (typeof value === 'object') {
            // Handle other objects (like dueDate ranges)
            try {
              params.append(key, JSON.stringify(value));
            } catch (error) {
              console.warn('📋 TaskService: Failed to stringify filter value:', { key, value, error });
            }
          } else {
            // Handle primitive values
            // For known array fields, convert single values to array format
            const arrayFields = ['status', 'priority', 'task_type', 'assignedTo', 'tags', 'category', 'assignee', 'channel'];
            if (arrayFields.includes(key)) {
              // Add as array even if single value
              params.append(key, value.toString());
            } else {
              params.append(key, value.toString());
            }
          }
        }
      });
    }

    const queryString = params.toString();
    const endpoint = `/tasks${queryString ? `?${queryString}` : ''}`;
    
    console.log('📋 TaskService: Making request with endpoint:', endpoint);
    console.log('📋 TaskService: Final query params:', Object.fromEntries(params.entries()));
    
    return this.makeRequest<TaskListResponse>(endpoint);
  }

  /**
   * Get single task by ID
   */
  async getTask(taskId: string): Promise<TaskResponse> {
    return this.makeRequest<TaskResponse>(`/tasks/${taskId}`);
  }

  /**
   * Create new task
   */
  async createTask(taskData: CreateTaskData): Promise<TaskResponse> {
    return this.makeRequest<TaskResponse>('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<TaskResponse> {
    return this.makeRequest<TaskResponse>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<TaskResponse> {
    return this.makeRequest<TaskResponse>(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Assign users to task
   */
  async assignTask(taskId: string, userIds: string[]): Promise<ApiResponse<string>> {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('User IDs must be a non-empty array');
    }
    
    return this.makeRequest<ApiResponse<string>>(`/tasks/${taskId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  }

  /**
   * Delete task (soft delete)
   */
  async deleteTask(taskId: string): Promise<ApiResponse<string>> {
    return this.makeRequest<ApiResponse<string>>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get task statistics
   */
  async getTaskStats(userId?: string): Promise<TaskStatsResponse> {
    const params = userId ? `?user_id=${userId}` : '';
    return this.makeRequest<TaskStatsResponse>(`/tasks/stats${params}`);
  }

  /**
   * Search tasks
   */
  async searchTasks(
    searchTerm: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<TaskListResponse> {
    if (!searchTerm?.trim()) {
      throw new Error('Search term is required');
    }
    
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    
    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }
    
    // Sanitize search term
    const sanitizedTerm = searchTerm.trim().replace(/[<>"'&]/g, '');
    
    return this.getTasks({
      // Note: This would be handled by the backend's search implementation
      tags: [sanitizedTerm], // Temporary implementation - backend should handle full-text search
      limit,
      offset
    });
  }

  /**
   * Get tasks assigned to user
   */
  async getMyTasks(
    status?: TaskStatus[], 
    limit: number = 50
  ): Promise<TaskListResponse> {
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    
    return this.getTasks({
      status,
      limit,
      assignee: ['@me'] // Special value that backend interprets as current user
    });
  }

  /**
   * Get tasks in specific channel
   */
  async getChannelTasks(
    channelId: string, 
    includeCompleted: boolean = false,
    limit: number = 50
  ): Promise<TaskListResponse> {
    if (!channelId?.trim()) {
      throw new Error('Channel ID is required');
    }
    
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }

    const filters: TaskFilter & { limit: number; channel: string[] } = {
      channel: [channelId],
      limit
    };

    if (!includeCompleted) {
      filters.status = ['pending', 'in_progress', 'on_hold'];
    }

    return this.getTasks(filters);
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(limit: number = 50): Promise<TaskListResponse> {
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    
    const today = new Date();
    return this.getTasks({
      dueDate: {
        to: today
      },
      status: ['pending', 'in_progress', 'on_hold'],
      limit
    });
  }

  /**
   * Get tasks by priority
   */
  async getTasksByPriority(
    priority: TaskPriority[], 
    limit: number = 50
  ): Promise<TaskListResponse> {
    if (!Array.isArray(priority) || priority.length === 0) {
      throw new Error('Priority must be a non-empty array');
    }
    
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    
    return this.getTasks({
      priority,
      limit
    });
  }

  /**
   * Get voice-created tasks
   */
  async getVoiceTasks(limit: number = 50): Promise<TaskListResponse> {
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    
    return this.getTasks({
      tags: ['voice-created'],
      limit
    });
  }

  /**
   * Update task progress
   */
  async updateTaskProgress(taskId: string, progressPercentage: number): Promise<TaskResponse> {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    if (typeof progressPercentage !== 'number' || progressPercentage < 0 || progressPercentage > 100) {
      throw new Error('Progress percentage must be a number between 0 and 100');
    }
    
    return this.updateTask(taskId, { progress: progressPercentage });
  }

  /**
   * Add task watcher
   */
  async addWatcher(taskId: string, userId: string): Promise<ApiResponse<string>> {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }
    
    return this.makeRequest<ApiResponse<string>>(`/tasks/${taskId}/watchers`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  /**
   * Remove task watcher
   */
  async removeWatcher(taskId: string, userId: string): Promise<ApiResponse<string>> {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }
    
    return this.makeRequest<ApiResponse<string>>(`/tasks/${taskId}/watchers/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Bulk update tasks
   */
  async bulkUpdateTasks(
    taskIds: string[], 
    updates: Partial<Task>
  ): Promise<ApiResponse<BulkOperationResult>> {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('Task IDs must be a non-empty array');
    }
    
    if (taskIds.length > 100) {
      throw new Error('Cannot update more than 100 tasks at once');
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('Updates object cannot be empty');
    }
    
    // Use dedicated bulk update endpoint for better performance
    return this.makeRequest<ApiResponse<BulkOperationResult>>('/tasks/bulk-update', {
      method: 'PATCH',
      body: JSON.stringify({ taskIds, updates }),
    });
  }

  /**
   * Export tasks to various formats
   */
  async exportTasks(
    format: 'json' | 'csv' | 'excel',
    filters?: TaskFilter
  ): Promise<{ content: string; mimeType: string; filename: string }> {
    if (!['json', 'csv', 'excel'].includes(format)) {
      throw new Error(`Export format ${format} not supported`);
    }
    
    // Get all matching tasks with pagination to avoid memory issues
    const allTasks: Task[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;
    
    while (hasMore && allTasks.length < 10000) { // Safety limit
      const response = await this.getTasks({ ...filters, limit, offset });
      allTasks.push(...response.data);
      hasMore = response.pagination.hasMore;
      offset += limit;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format) {
      case 'json': {
        const content = JSON.stringify(allTasks, null, 2);
        return {
          content,
          mimeType: 'application/json',
          filename: `tasks-export-${timestamp}.json`
        };
      }
      
      case 'csv': {
        // Convert to CSV format with proper escaping
        const csvHeaders = ['ID', 'Title', 'Status', 'Priority', 'Assignees', 'Channel', 'Due Date', 'Created', 'Progress'];
        const csvRows = allTasks.map(task => [
          this.escapeCsvField(task.id),
          this.escapeCsvField(task.title),
          this.escapeCsvField(task.status),
          this.escapeCsvField(task.priority),
          this.escapeCsvField((task.assignees?.map(a => a.name) ?? []).join(', ')),
          this.escapeCsvField(task.channelName || ''),
          this.escapeCsvField(task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''),
          this.escapeCsvField(new Date(task.created_at).toLocaleDateString()),
          this.escapeCsvField((task.progress !== undefined ? task.progress : '').toString())
        ]);
        
        const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        return {
          content: csvContent,
          mimeType: 'text/csv',
          filename: `tasks-export-${timestamp}.csv`
        };
      }
      
      case 'excel': {
        // For Excel, we'll use a simple tab-separated format that Excel can import
        const headers = ['ID', 'Title', 'Status', 'Priority', 'Assignees', 'Channel', 'Due Date', 'Created', 'Progress'];
        const rows = allTasks.map(task => [
          task.id,
          task.title.replace(/\t/g, ' '),
          task.status,
          task.priority,
          (task.assignees ?? []).map(a => a.name).join(', '),
          task.channelName || '',
          task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '',
          new Date(task.created_at).toLocaleDateString(),
          (task.progress !== undefined ? task.progress.toString() : '')
        ]);
        
        const content = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
        return {
          content,
          mimeType: 'application/vnd.ms-excel',
          filename: `tasks-export-${timestamp}.xlsx`
        };
      }
      
      default:
        throw new Error(`Export format ${format} not supported`);
    }
  }
  
  /**
   * Get task comments
   */
  async getTaskComments(taskId: string): Promise<CommentsListResponse> {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    return this.makeRequest<CommentsListResponse>(`/tasks/${taskId}/comments`);
  }

  /**
   * Add comment to task
   */
  async addComment(taskId: string, content: string): Promise<CommentResponse> {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    if (!content?.trim()) {
      throw new Error('Comment content is required');
    }
    
    return this.makeRequest<CommentResponse>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: content.trim() }),
    });
  }

  /**
   * Update comment
   */
  async updateComment(taskId: string, commentId: string, content: string): Promise<CommentResponse> {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    if (!commentId?.trim()) {
      throw new Error('Comment ID is required');
    }
    
    if (!content?.trim()) {
      throw new Error('Comment content is required');
    }
    
    return this.makeRequest<CommentResponse>(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content: content.trim() }),
    });
  }

  /**
   * Delete comment
   */
  async deleteComment(taskId: string, commentId: string): Promise<ApiResponse<string>> {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    if (!commentId?.trim()) {
      throw new Error('Comment ID is required');
    }
    
    return this.makeRequest<ApiResponse<string>>(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Escape CSV field content
   */
  private escapeCsvField(value: string): string {
    if (!value) return '';
    
    // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }
}

export const taskService = new TaskService();