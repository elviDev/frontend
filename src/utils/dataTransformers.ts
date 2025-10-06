import { Task, TaskAssignee, TaskComment } from '../types/task.types';
import { ApiMessage } from '../types/api';

/**
 * Data transformers for consistent backend-frontend data mapping
 * All transformations should happen here to avoid manual field mapping across components
 */

export class TaskDataTransformer {
  /**
   * Transform backend task data to frontend format
   * Simplified to only handle essential field defaults and frontend-only fields
   */
  static transformTask(backendTask: any): Task {
    return {
      // Direct field mapping - backend and frontend types now match
      ...backendTask,
      
      // Provide defaults for arrays and optional fields
      assigned_to: backendTask.assigned_to || [],
      tags: backendTask.tags || [],
      watchers: backendTask.watchers || [],
      labels: backendTask.labels || {},
      custom_fields: backendTask.custom_fields || {},
      actual_hours: backendTask.actual_hours || 0,
      progress_percentage: backendTask.progress_percentage || 0,
      complexity: backendTask.complexity || 1,
      voice_created: backendTask.voice_created || false,
      business_value: backendTask.business_value || 'medium',
      assignee_details: backendTask.assignee_details || [],
      subtask_count: backendTask.subtask_count || 0,
      dependency_count: backendTask.dependency_count || 0,
      comments_count: backendTask.comments_count || 0,
      attachments_count: backendTask.attachments_count || 0,
      
      // Frontend-only fields (populated separately)
      subtasks: [],
      comments: [],
      attachments: [],
      dependencies: [],
    };
  }

  /**
   * Transform multiple tasks
   */
  static transformTasks(backendTasks: any[]): Task[] {
    return backendTasks.map(task => this.transformTask(task));
  }

  /**
   * Transform backend assignee data
   */
  static transformAssignee(backendAssignee: any): TaskAssignee {
    return {
      id: backendAssignee.id,
      name: backendAssignee.name,
      email: backendAssignee.email,
      avatar_url: backendAssignee.avatar_url,
      role: backendAssignee.role,
      phone: backendAssignee.phone,
    };
  }

  /**
   * Transform backend comment data
   */
  static transformComment(backendComment: any): TaskComment {
    return {
      id: backendComment.id,
      content: backendComment.content,
      author: {
        id: backendComment.author_id || backendComment.user_id,
        name: backendComment.author_name || backendComment.user_name,
        email: backendComment.author_email || backendComment.user_email,
        avatar_url: backendComment.author_avatar_url,
        role: backendComment.author_role || 'staff',
        phone: backendComment.author_phone,
      },
      timestamp: new Date(backendComment.created_at),
      attachments: backendComment.attachments || [],
      reactions: {
        thumbs_up: parseInt(backendComment.up_count || '0'),
        thumbs_down: parseInt(backendComment.down_count || '0'),
      },
      userReactions: {},
      
      // Additional backend fields
      task_id: backendComment.task_id,
      author_id: backendComment.author_id,
      author_name: backendComment.author_name,
      author_email: backendComment.author_email,
      is_edited: backendComment.is_edited || false,
      edited_at: backendComment.edited_at,
      edited_by: backendComment.edited_by,
      edited_by_name: backendComment.edited_by_name,
      parent_comment_id: backendComment.parent_comment_id,
      created_at: backendComment.created_at,
      updated_at: backendComment.updated_at,
      deleted_at: backendComment.deleted_at,
      deleted_by: backendComment.deleted_by,
      up_count: backendComment.up_count,
      down_count: backendComment.down_count,
      total_reactions: backendComment.total_reactions,
      user_reaction: backendComment.user_reaction,
    };
  }
}

export class MessageDataTransformer {
  /**
   * Transform backend message data to frontend format
   */
  static transformMessage(backendMessage: any): ApiMessage {
    return {
      id: backendMessage.id,
      content: backendMessage.content,
      channel_id: backendMessage.channel_id,
      user_id: backendMessage.user_id,
      user_details: backendMessage.user_details ? {
        id: backendMessage.user_details.id,
        name: backendMessage.user_details.name,
        email: backendMessage.user_details.email,
        avatar_url: backendMessage.user_details.avatar_url,
        role: backendMessage.user_details.role,
      } : undefined,
      message_type: backendMessage.message_type || 'text',
      reply_to_id: backendMessage.reply_to_id,
      reply_to: backendMessage.reply_to,
      reactions: backendMessage.reactions || [],
      attachments: backendMessage.attachments || [],
      voice_data: backendMessage.voice_data,
      mentions: backendMessage.mentions || [],
      metadata: backendMessage.metadata || {},
      created_at: backendMessage.created_at,
      updated_at: backendMessage.updated_at,
      is_edited: backendMessage.is_edited,
      edited_at: backendMessage.edited_at,
      deleted_at: backendMessage.deleted_at,
      reply_count: backendMessage.reply_count,
      last_reply_timestamp: backendMessage.last_reply_timestamp,
    };
  }

  /**
   * Transform multiple messages
   */
  static transformMessages(backendMessages: any[]): ApiMessage[] {
    return backendMessages.map(message => this.transformMessage(message));
  }
}

export class WebSocketDataTransformer {
  /**
   * Transform WebSocket task events to match frontend expectations
   */
  static transformTaskEvent(backendEvent: any) {
    return {
      type: backendEvent.type,
      taskId: backendEvent.taskId || backendEvent.task_id,
      channelId: backendEvent.channelId || backendEvent.channel_id,
      task: backendEvent.task ? TaskDataTransformer.transformTask(backendEvent.task) : undefined,
      action: backendEvent.action,
      changes: backendEvent.changes,
      userId: backendEvent.userId || backendEvent.user_id,
      userName: backendEvent.userName || backendEvent.user_name,
      userRole: backendEvent.userRole || backendEvent.user_role,
      timestamp: backendEvent.timestamp,
    };
  }

  /**
   * Transform WebSocket comment events
   */
  static transformCommentEvent(backendEvent: any) {
    return {
      type: backendEvent.type,
      commentId: backendEvent.commentId || backendEvent.comment_id,
      taskId: backendEvent.taskId || backendEvent.task_id,
      channelId: backendEvent.channelId || backendEvent.channel_id,
      comment: backendEvent.comment ? TaskDataTransformer.transformComment(backendEvent.comment) : undefined,
      userId: backendEvent.userId || backendEvent.user_id,
      userName: backendEvent.userName || backendEvent.user_name,
      timestamp: backendEvent.timestamp,
    };
  }

  /**
   * Transform WebSocket message events
   */
  static transformMessageEvent(backendEvent: any) {
    return {
      type: backendEvent.type,
      messageId: backendEvent.messageId || backendEvent.message_id,
      channelId: backendEvent.channelId || backendEvent.channel_id,
      message: backendEvent.message ? MessageDataTransformer.transformMessage(backendEvent.message) : undefined,
      userId: backendEvent.userId || backendEvent.user_id,
      userName: backendEvent.userName || backendEvent.user_name,
      timestamp: backendEvent.timestamp,
    };
  }
}

// FilterDataTransformer removed - no longer needed since frontend and backend filters match