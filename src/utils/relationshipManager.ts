import { Task, TaskAssignee } from '../types/task.types';
import { store } from '../store/store';

/**
 * Manages data relationships and ensures consistent state updates
 * Prevents data inconsistencies by managing related entities together
 */

export class TaskRelationshipManager {
  /**
   * Update task with proper relationship management
   */
  static updateTaskWithRelations(taskId: string, updates: Partial<Task>, dispatch: any) {
    const state = store.getState();
    const currentTask = state.tasks.tasks.find(t => t.id === taskId);
    
    if (!currentTask) {
      console.warn('TaskRelationshipManager: Task not found for relationship update:', taskId);
      return;
    }

    // Handle assignee relationship changes
    if (updates.assigned_to && Array.isArray(updates.assigned_to)) {
      // Ensure assignee_details are properly populated when assigned_to changes
      if (!updates.assignee_details) {
        console.warn('TaskRelationshipManager: assignee_details missing when assigned_to is updated');
      }
    }

    // Handle channel relationship changes
    if (updates.channel_id && updates.channel_id !== currentTask.channel_id) {
      // Remove task from old channel in Redux state
      if (currentTask.channel_id) {
        dispatch({
          type: 'tasks/removeFromChannel',
          payload: { taskId, channelId: currentTask.channel_id }
        });
      }
      
      // Add task to new channel in Redux state
      dispatch({
        type: 'tasks/addToChannel',
        payload: { 
          task: { ...currentTask, ...updates },
          channelId: updates.channel_id 
        }
      });
    }

    // Handle status changes that affect related data
    if (updates.status && updates.status !== currentTask.status) {
      if (updates.status === 'completed' && !updates.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
    }

    // Apply the update
    dispatch({
      type: 'tasks/updateTask',
      payload: { taskId, updates }
    });
  }

  /**
   * Create task with proper relationship setup
   */
  static createTaskWithRelations(taskData: Partial<Task>, dispatch: any) {
    const enrichedTask = {
      ...taskData,
      id: taskData.id || this.generateTempId(),
      created_at: taskData.created_at || new Date().toISOString(),
      updated_at: taskData.updated_at || new Date().toISOString(),
      assigned_to: taskData.assigned_to || [],
      tags: taskData.tags || [],
      watchers: taskData.watchers || [],
      comments_count: 0,
      attachments_count: 0,
      subtask_count: 0,
      dependency_count: 0,
      actual_hours: 0,
      progress_percentage: 0,
      complexity: 1,
      business_value: taskData.business_value || 'medium',
      labels: taskData.labels || {},
      custom_fields: taskData.custom_fields || {},
      voice_created: taskData.voice_created || false,
      subtasks: [],
      comments: [],
      attachments: [],
      dependencies: [],
    };

    // Add to main tasks list
    dispatch({
      type: 'tasks/addTask',
      payload: enrichedTask
    });

    // Add to channel tasks if channel_id is specified
    if (enrichedTask.channel_id) {
      dispatch({
        type: 'tasks/addToChannel',
        payload: { 
          task: enrichedTask,
          channelId: enrichedTask.channel_id 
        }
      });
    }

    return enrichedTask;
  }

  /**
   * Delete task with proper relationship cleanup
   */
  static deleteTaskWithRelations(taskId: string, dispatch: any) {
    const state = store.getState();
    const task = state.tasks.tasks.find(t => t.id === taskId);
    
    if (!task) {
      console.warn('TaskRelationshipManager: Task not found for deletion:', taskId);
      return;
    }

    // Remove from channel tasks
    if (task.channel_id) {
      dispatch({
        type: 'tasks/removeFromChannel',
        payload: { taskId, channelId: task.channel_id }
      });
    }

    // Remove from main tasks list
    dispatch({
      type: 'tasks/removeTask',
      payload: taskId
    });

    // Clean up any related WebSocket subscriptions
    // This should be handled by the WebSocket service
  }

  /**
   * Ensure task assignees have proper details
   */
  static ensureAssigneeDetails(task: Task): Task {
    if (!task.assigned_to || task.assigned_to.length === 0) {
      return {
        ...task,
        assignee_details: []
      };
    }

    // If assignee_details are missing but assigned_to exists, 
    // we should fetch the details from the backend
    if (!task.assignee_details || task.assignee_details.length === 0) {
      console.warn('TaskRelationshipManager: Missing assignee_details for task:', task.id);
      
      // Return task with placeholder assignee details
      const placeholderDetails = task.assigned_to.map(userId => ({
        id: userId,
        name: 'Loading...',
        email: '',
        role: 'staff' as const,
        avatar_url: undefined,
        phone: undefined,
      }));

      return {
        ...task,
        assignee_details: placeholderDetails
      };
    }

    // Ensure assignee_details matches assigned_to
    const validDetails = task.assignee_details.filter(detail => 
      task.assigned_to.includes(detail.id)
    );

    return {
      ...task,
      assignee_details: validDetails
    };
  }

  /**
   * Sync task counts and statistics
   */
  static syncTaskStatistics(dispatch: any) {
    const state = store.getState();
    const tasks = state.tasks.tasks;

    const statistics = {
      totalTasks: tasks.length,
      tasksByStatus: {
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
        on_hold: tasks.filter(t => t.status === 'on_hold').length,
      },
      tasksByPriority: {
        low: tasks.filter(t => t.priority === 'low').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        high: tasks.filter(t => t.priority === 'high').length,
        urgent: tasks.filter(t => t.priority === 'urgent').length,
        critical: tasks.filter(t => t.priority === 'critical').length,
      },
      overdueTasks: tasks.filter(t => {
        if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
        return new Date(t.due_date) < new Date();
      }).length,
      completedThisWeek: tasks.filter(t => {
        if (t.status !== 'completed' || !t.completed_at) return false;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return new Date(t.completed_at) >= weekAgo;
      }).length,
      averageCompletionTime: 0, // This should be calculated on the backend
    };

    dispatch({
      type: 'tasks/updateStatistics',
      payload: statistics
    });
  }

  /**
   * Generate temporary ID for optimistic updates
   */
  private static generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class ChannelRelationshipManager {
  /**
   * Update channel membership and related tasks
   */
  static updateChannelMembership(channelId: string, userId: string, action: 'add' | 'remove', dispatch: any) {
    dispatch({
      type: 'channels/updateMembership',
      payload: { channelId, userId, action }
    });

    // If removing user from channel, also remove them from channel tasks
    if (action === 'remove') {
      const state = store.getState();
      const channelTasks = state.tasks.channelTasks[channelId] || [];
      
      channelTasks.forEach(task => {
        if (task.assigned_to.includes(userId)) {
          TaskRelationshipManager.updateTaskWithRelations(
            task.id,
            {
              assigned_to: task.assigned_to.filter(id => id !== userId),
              assignee_details: task.assignee_details?.filter(detail => detail.id !== userId)
            },
            dispatch
          );
        }
      });
    }
  }
}

export class UserRelationshipManager {
  /**
   * Update user role and propagate changes
   */
  static updateUserRole(userId: string, newRole: 'ceo' | 'manager' | 'staff', dispatch: any) {
    dispatch({
      type: 'auth/updateUserRole',
      payload: { userId, role: newRole }
    });

    // Update user role in all task assignee_details
    const state = store.getState();
    const tasks = state.tasks.tasks;

    tasks.forEach(task => {
      if (task.assignee_details) {
        const updatedDetails = task.assignee_details.map(assignee => 
          assignee.id === userId ? { ...assignee, role: newRole } : assignee
        );

        if (JSON.stringify(updatedDetails) !== JSON.stringify(task.assignee_details)) {
          TaskRelationshipManager.updateTaskWithRelations(
            task.id,
            { assignee_details: updatedDetails },
            dispatch
          );
        }
      }
    });
  }

  /**
   * Remove user from all related entities
   */
  static removeUserFromSystem(userId: string, dispatch: any) {
    const state = store.getState();
    const tasks = state.tasks.tasks;

    // Remove user from all task assignments
    tasks.forEach(task => {
      if (task.assigned_to.includes(userId)) {
        TaskRelationshipManager.updateTaskWithRelations(
          task.id,
          {
            assigned_to: task.assigned_to.filter(id => id !== userId),
            assignee_details: task.assignee_details?.filter(detail => detail.id !== userId)
          },
          dispatch
        );
      }
    });

    // Remove user from channels (this should be handled by ChannelRelationshipManager)
    // Remove user from system
    dispatch({
      type: 'users/removeUser',
      payload: userId
    });
  }
}