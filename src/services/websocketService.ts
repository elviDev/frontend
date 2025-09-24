import React from 'react';
import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import { tokenManager } from './tokenManager';
import { 
  taskUpdatedRealtime, 
  taskCreatedRealtime, 
  taskDeletedRealtime 
} from '../store/slices/taskSlice';
import { Task } from '../types/task.types';
import { WS_BASE_URL } from '../config/api';
export type WebSocketEventType = 
  | 'task_created' 
  | 'task_updated' 
  | 'task_completed' 
  | 'task_deleted'
  | 'task_assigned'
  | 'task_status_changed'
  | 'comment_added'
  | 'comment_created'
  | 'comment_updated'
  | 'comment_deleted'
  | 'user_typing'
  | 'presence_update'
  | 'message_sent'
  | 'message_updated'
  | 'message_deleted'
  | 'message_reaction_added'
  | 'message_reaction_removed'
  | 'thread_created'
  | 'thread_reply'
  | 'thread_deleted'
  | 'reaction_toggled'
  | 'reactions_cleared'
  | 'typing_indicator'
  | 'user_joined_channel'
  | 'user_left_channel'
  | 'chat_message'
  | 'task_comment'
  | 'task_comment_updated'
  | 'task_comment_deleted'
  | 'sync_requested'
  | 'sync_response';

export type TaskActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'assign' 
  | 'unassign'
  | 'complete' 
  | 'status_change'
  | 'priority_change'
  | 'comment'
  | 'comment_created'
  | 'comment_updated'
  | 'comment_deleted';

export interface TaskUpdateEvent {
  type: WebSocketEventType;
  taskId: string;
  channelId?: string;
  task: Task;
  action: TaskActionType;
  changes?: Partial<Task>;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
}

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationEvent {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  priority: NotificationPriority;
  createdAt: string;
  userId?: string;
  channelId?: string;
  taskId?: string;
  read: boolean;
}

export interface TypingEvent {
  taskId?: string;
  channelId?: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
  threadRootId?: string;
}

export interface MessageEvent {
  type: 'message_sent' | 'message_updated' | 'message_deleted';
  messageId: string;
  channelId: string;
  message?: {
    id: string;
    content: string;
    message_type: string;
    sender: {
      id: string;
      name: string;
      role?: string;
      avatar?: string;
    };
    timestamp: string;
    reactions?: any[];
    reply_to?: string;
    mentions?: string[];
  };
  userId: string;
  userName: string;
  timestamp: string;
  isThreadReply?: boolean;
  threadRootId?: string;
}

export interface ThreadEvent {
  type: 'thread_created' | 'thread_reply' | 'thread_deleted';
  threadRootId: string;
  channelId: string;
  createdBy?: string;
  replyId?: string;
  reply?: any;
  message?: any;
}

export interface ReactionEvent {
  messageId: string;
  emoji: string;
  action: 'added' | 'removed';
  currentReactions: Array<{
    emoji: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
      avatar_url?: string;
    }>;
  }>;
}

export interface ChannelEvent {
  channelId: string;
  userId: string;
  user?: any;
}

export interface CommentEvent {
  type: 'comment_created' | 'comment_updated' | 'comment_deleted';
  commentId: string;
  taskId: string;
  channelId?: string;
  comment?: {
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
      email: string;
      avatar_url?: string;
    };
    created_at: string;
    updated_at: string;
    is_edited?: boolean;
    attachments?: any[];
  };
  userId: string;
  userName: string;
  timestamp: string;
}

export interface ChatMessageEvent {
  type: 'chat_message';
  messageType: 'task_comment' | 'task_comment_updated' | 'task_comment_deleted';
  taskId: string;
  channelId: string;
  commentId: string;
  message?: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface MessageReactionEvent {
  type: 'message_reaction_added' | 'message_reaction_removed';
  messageId: string;
  channelId: string;
  emoji: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface ChannelTypingEvent {
  channelId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
}

export interface PresenceEvent {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  timestamp: string;
}

export interface WebSocketError {
  code: string;
  message: string;
  details?: any;
}

export type EventListener<T = any> = (data: T) => void;

export interface WebSocketConnectionConfig {
  url: string;
  timeout: number;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  transports: ('websocket' | 'polling')[];
}

/**
 * WebSocket Service for real-time task updates and notifications
 */
class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private isConnecting = false;
  private eventListeners = new Map<string, Set<EventListener>>();
  private connectionPromise: Promise<void> | null = null;
  private isDestroyed = false;
  private tokenUnsubscribe: (() => void) | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private config: WebSocketConnectionConfig;
  
  // Enhanced connection management from messageWebSocketService
  private heartbeatTimeoutMs = 15000; // 15 seconds timeout
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private pendingOperations: Array<() => void> = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime = 0;
  
  // Channel and room management
  private joinedChannels = new Set<string>();
  private joinedTasks = new Set<string>();

  constructor(config?: Partial<WebSocketConnectionConfig>) {
    // For Android emulator, use 10.0.2.2, for iOS simulator/web use localhost
    // Remove /api/v1 from URL since Socket.IO has its own path configuration


    const wsUrl = WS_BASE_URL;
    const defaultUrl = wsUrl.replace('/api/v1', '');
    
    this.config = {
      url: defaultUrl,
      timeout: 20000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      ...config
    };
    
    this.maxReconnectAttempts = this.config.reconnectionAttempts;
    this.connect();
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    // Return existing connection if already connected
    if (this.socket?.connected && this.connectionState === 'connected') {
      console.log('📡 WebSocket: Already connected');
      return;
    }

    // Return existing connection promise if already connecting
    if ((this.isConnecting || this.connectionState === 'connecting') && this.connectionPromise) {
      console.log('📡 WebSocket: Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionState = 'connecting';
    
    this.connectionPromise = this._doConnect();
    
    try {
      await this.connectionPromise;
      this.connectionState = 'connected';
      this.startHeartbeat();
      this.startSyncInterval();
      this.executePendingOperations();
    } catch (error) {
      this.connectionState = 'disconnected';
      throw error;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async _doConnect(): Promise<void> {
    try {
      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      const token = await tokenManager.getCurrentToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const serverUrl = this.config.url;
      
      console.log('🔌 WebSocket: Connecting with token in auth:', {
        serverUrl,
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      });
      
      this.socket = io(serverUrl, {
        auth: { token },
        transports: this.config.transports,
        timeout: this.config.timeout,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        forceNew: true,
      });

      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, this.config.timeout);

        this.socket!.on('connect', () => {
          clearTimeout(connectTimeout);
          console.log('✅ WebSocket: Connected to server');
          this.reconnectAttempts = 0;
          this.connectionState = 'connected';
          
          // Clear any pending reconnection timeout
          if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
          }
          
          // Rejoin previously joined channels and tasks
          this.rejoinRooms();
          
          // Request sync from server for missed events
          this.requestSync();
          
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(connectTimeout);
          console.error('❌ WebSocket: Connection error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ WebSocket: Failed to connect:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Listen for token changes to automatically re-authenticate
    if (!this.tokenUnsubscribe) {
      this.tokenUnsubscribe = tokenManager.onTokenChange((newToken) => {
        console.log('🔄 WebSocket: Token changed, reconnecting with new token...', !!newToken);
        if (newToken) {
          if (this.socket?.connected) {
            this.disconnect();
            setTimeout(() => this.connect(), 1000);
          }
        } else {
          this.disconnect();
        }
      });
    }

    // Connection events
    this.socket.on('connect', () => {
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket: Disconnected:', reason);
      this.connectionState = 'disconnected';
      this.stopHeartbeat();
      this.stopSyncInterval();
      this.emit('disconnect', reason);
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        console.log('🔄 Server initiated disconnect, attempting immediate reconnection');
        this.handleReconnection();
      } else if (reason === 'ping timeout' || reason === 'transport close') {
        console.log('🔄 Connection lost, attempting reconnection');
        this.handleReconnection();
      } else if (reason !== 'io client disconnect') {
        console.log('🔄 Unexpected disconnect, attempting reconnection');
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket: Error:', error);
      this.emit('error', error);
    });

    // Task-specific events
    this.socket.on('task_update', (event: TaskUpdateEvent) => {
      this.handleTaskUpdate(event);
    });

    // Comment events from task operations
    this.socket.on('comment_created', (event: CommentEvent) => {
      console.log('💬 WebSocket: Comment created:', event);
      this.handleCommentEvent(event);
      this.emit('comment_created', event);
    });

    this.socket.on('comment_updated', (event: CommentEvent) => {
      console.log('✏️ WebSocket: Comment updated:', event);
      this.handleCommentEvent(event);
      this.emit('comment_updated', event);
    });

    this.socket.on('comment_deleted', (event: CommentEvent) => {
      console.log('🗑️ WebSocket: Comment deleted:', event);
      this.handleCommentEvent(event);
      this.emit('comment_deleted', event);
    });

    // Chat message events for task comments
    this.socket.on('chat_message', (event: ChatMessageEvent) => {
      console.log('📩 WebSocket: Chat message (task comment):', event);
      this.handleChatMessageEvent(event);
      this.emit('chat_message', event);
    });

    // Notification events
    this.socket.on('notification', (notification: NotificationEvent) => {
      this.handleNotification(notification);
    });
    
    // Message events - unified from messageWebSocketService
    this.socket.on('message_sent', (data) => {
      console.log('📨 WebSocket: Message sent:', data);
      this.emit('message_sent', data);
    });

    this.socket.on('message_updated', (data) => {
      console.log('✏️ WebSocket: Message updated:', data);
      this.emit('message_updated', data);
    });

    this.socket.on('message_deleted', (data) => {
      console.log('🗑️ WebSocket: Message deleted:', data);
      this.emit('message_deleted', data);
    });

    // Thread events
    this.socket.on('thread_created', (data) => {
      console.log('🧵 WebSocket: Thread created:', data);
      this.emit('thread_created', data);
    });

    this.socket.on('thread_reply', (data) => {
      console.log('💬 WebSocket: Thread reply:', data);
      this.emit('thread_reply', data);
    });

    this.socket.on('thread_deleted', (data) => {
      console.log('🗑️ WebSocket: Thread deleted:', data);
      this.emit('thread_deleted', data);
    });

    // Reaction events
    this.socket.on('reaction_toggled', (data) => {
      console.log('😀 WebSocket: Reaction toggled:', data);
      this.emit('reaction_toggled', data);
    });

    this.socket.on('reactions_cleared', (data) => {
      console.log('🧹 WebSocket: Reactions cleared:', data);
      this.emit('reactions_cleared', data);
    });

    // Channel events
    this.socket.on('user_joined_channel', (data) => {
      console.log('👋 WebSocket: User joined channel:', data);
      this.emit('user_joined_channel', data);
    });

    this.socket.on('user_left_channel', (data) => {
      console.log('👋 WebSocket: User left channel:', data);
      this.emit('user_left_channel', data);
    });
    
    // Typing events (unified for both tasks and channels)
    this.socket.on('user_typing', (event: TypingEvent) => {
      if (this.validateTypingEvent(event)) {
        this.emitToListeners('user_typing', event);
      }
    });

    this.socket.on('typing_indicator', (data) => {
      this.emit('typing_indicator', data);
    });
    
    // Presence events
    this.socket.on('presence_update', (event: PresenceEvent) => {
      if (this.validatePresenceEvent(event)) {
        this.emitToListeners('presence_update', event);
      }
    });
    
    // Message reaction events
    this.socket.on('message_reaction_added', (event: MessageReactionEvent) => {
      if (this.validateMessageReactionEvent(event)) {
        this.emitToListeners('message_reaction_added', event);
      }
    });
    
    this.socket.on('message_reaction_removed', (event: MessageReactionEvent) => {
      if (this.validateMessageReactionEvent(event)) {
        this.emitToListeners('message_reaction_removed', event);
      }
    });
    
    // Channel typing events
    this.socket.on('channel_typing_start', (event: ChannelTypingEvent) => {
      if (this.validateChannelTypingEvent(event)) {
        this.emitToListeners('channel_typing_start', event);
      }
    });
    
    this.socket.on('channel_typing_stop', (event: ChannelTypingEvent) => {
      if (this.validateChannelTypingEvent(event)) {
        this.emitToListeners('channel_typing_stop', event);
      }
    });
    
    // Heartbeat/ping response
    this.socket.on('pong', () => {
      this.lastHeartbeat = Date.now();
    });
    
    // Sync events
    this.socket.on('sync_response', (data) => {
      console.log('🔄 WebSocket: Received sync response:', data);
      this.emit('sync_response', data);
    });

    // Generic event handler for custom listeners
    this.socket.onAny((eventName: string, ...args: any[]) => {
      this.emitToListeners(eventName, args.length === 1 ? args[0] : args);
    });
  }

  private rejoinRooms(): void {
    // Rejoin previously joined channels
    this.joinedChannels.forEach(channelId => {
      if (this.socket?.connected) {
        this.socket.emit('join_channel', { channelId });
        console.log(`🔄 WebSocket: Rejoined channel: ${channelId}`);
      }
    });

    // Rejoin previously joined tasks
    this.joinedTasks.forEach(taskId => {
      if (this.socket?.connected) {
        this.socket.emit('join_task', { taskId });
        console.log(`🔄 WebSocket: Rejoined task: ${taskId}`);
      }
    });
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ WebSocket: Max reconnection attempts reached');
      this.connectionState = 'disconnected';
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    if (this.connectionState === 'reconnecting' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const baseDelay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, 30000);
    
    console.log(`🔄 WebSocket: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(delay)}ms`);
    
    this.reconnectTimeoutId = setTimeout(async () => {
      try {
        await this.connect();
        console.log('✅ WebSocket: Reconnection successful');
      } catch (error) {
        console.error('❌ WebSocket: Reconnection failed:', error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnection();
        } else {
          this.connectionState = 'disconnected';
        }
      }
    }, delay);
  }

  private executePendingOperations(): void {
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];
    
    operations.forEach(operation => {
      try {
        operation();
      } catch (error) {
        console.error('❌ WebSocket: Error executing pending operation:', error);
      }
    });
  }
  
  private requestSync(): void {
    if (this.socket?.connected && this.lastSyncTime > 0) {
      const syncData = {
        lastSyncTime: this.lastSyncTime,
        channels: Array.from(this.joinedChannels),
        tasks: Array.from(this.joinedTasks),
      };
      
      console.log('🔄 WebSocket: Requesting sync for missed updates:', syncData);
      this.socket.emit('request_sync', syncData);
    }
    
    this.lastSyncTime = Date.now();
  }
  
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.lastSyncTime = Date.now();
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  private queueOperation(operation: () => void): void {
    if (this.socket?.connected) {
      operation();
    } else {
      this.pendingOperations.push(operation);
      console.log('📝 WebSocket: Queued operation for when connection is restored');
    }
  }

  /**
   * Schedule reconnection attempt (legacy method for backward compatibility)
   */
  private scheduleReconnect(): void {
    this.handleReconnection();
  }

  /**
   * Handle task updates from server
   */
  private handleTaskUpdate(event: TaskUpdateEvent): void {
    console.log('Task update received:', event);
    
    switch (event.type) {
      case 'task_created':
        store.dispatch(taskCreatedRealtime(event.task));
        break;
        
      case 'task_updated':
      case 'task_completed':
        store.dispatch(taskUpdatedRealtime(event.task));
        break;
        
      case 'task_deleted':
        store.dispatch(taskDeletedRealtime(event.taskId));
        break;
        
      default:
        console.warn('Unknown task update type:', event.type);
    }
  }

  /**
   * Handle notifications from server
   */
  private handleNotification(notification: NotificationEvent): void {
    console.log('Notification received:', notification);
    
    // Emit to custom listeners
    this.emitToListeners('notification', notification);
    
    // Show local notification if app is in background
    // This would typically integrate with react-native-push-notification
    // or Expo notifications
    this.showLocalNotification(notification);
  }

  /**
   * Show local notification
   */
  private async showLocalNotification(notification: NotificationEvent): Promise<void> {
    try {
      // Platform-specific notification handling
      // @ts-expect-error: 'window' might not be defined in some environments (e.g., Node.js)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        // Web notification
        // Platform-specific notification handling
        // @ts-expect-error: 'window' might not be defined in some environments (e.g., Node.js)
        if (typeof window !== 'undefined' && 'Notification' in window) {
          // Platform-specific notification handling
          // @ts-expect-error: 'window' might not be defined in some environments (e.g., Node.js)
          if (window.Notification.permission === 'granted') {
            // Platform-specific notification handling
            // @ts-expect-error: 'window' might not be defined in some environments (e.g., Node.js)
            const notif = new window.Notification(notification.title, {
              body: notification.message,
              icon: '/icon.png',
              tag: notification.notificationId,
              data: notification.data,
              requireInteraction: notification.priority === 'critical',
            });

            // Auto-close non-critical notifications
            if (notification.priority !== 'critical') {
              setTimeout(() => notif.close(), 5000);
            } // Platform-specific notification handling
            // @ts-expect-error: 'window' might not be defined in some environments (e.g., Node.js)
          } else if (window.Notification.permission === 'default') {
            // Request permission if not granted
            // Platform-specific notification handling
            // @ts-expect-error: 'window' might not be defined in some environments (e.g., Node.js)
            const permission = await window.Notification.requestPermission();
            if (permission === 'granted') {
              this.showLocalNotification(notification);
            }
          }
        }
      }
      // React Native notification would be handled here
      // This could integrate with expo-notifications or react-native-push-notification
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Emit event to registered listeners
   */
  private emitToListeners(eventName: string, data?: any): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in ${eventName} listener:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to custom events
   */
  on<T = any>(eventName: string, listener: EventListener<T>): () => void {
    if (!eventName?.trim()) {
      throw new Error('Event name is required');
    }
    
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }
    
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    
    this.eventListeners.get(eventName)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventName);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventName);
        }
      }
    };
  }

  /**
   * Unsubscribe from events
   */
  off<T = any>(eventName: string, listener?: EventListener<T>): void {
    if (!eventName?.trim()) {
      throw new Error('Event name is required');
    }
    
    if (listener) {
      const listeners = this.eventListeners.get(eventName);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventName);
        }
      }
    } else {
      this.eventListeners.delete(eventName);
    }
  }

  /**
   * Join room for channel-specific updates
   */
  joinChannel(channelId: string): void {
    if (!channelId?.trim()) {
      throw new Error('Channel ID is required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('join_channel', { channelId });
    } else {
      console.warn('Cannot join channel: WebSocket not connected');
    }
  }

  /**
   * Leave channel room
   */
  leaveChannel(channelId: string): void {
    if (!channelId?.trim()) {
      throw new Error('Channel ID is required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('leave_channel', { channelId });
    } else {
      console.warn('Cannot leave channel: WebSocket not connected');
    }
  }

  /**
   * Join room for task-specific updates
   */
  joinTask(taskId: string): void {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('join_task', { taskId });
    } else {
      console.warn('Cannot join task: WebSocket not connected');
    }
  }

  /**
   * Leave task room
   */
  leaveTask(taskId: string): void {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('leave_task', { taskId });
    } else {
      console.warn('Cannot leave task: WebSocket not connected');
    }
  }

  /**
   * Send typing indicator (works for both tasks and channels)
   */
  startTyping(roomId: string, roomType: 'task' | 'channel' = 'task', threadRootId?: string): void {
    if (!roomId?.trim()) {
      throw new Error('Room ID is required');
    }
    
    this.queueOperation(() => {
      if (this.socket?.connected) {
        if (roomType === 'task') {
          this.socket.emit('typing_start', { taskId: roomId, timestamp: new Date().toISOString() });
        } else {
          this.socket.emit('typing_start', { channelId: roomId, threadRootId, timestamp: new Date().toISOString() });
        }
      }
    });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(roomId: string, roomType: 'task' | 'channel' = 'task', threadRootId?: string): void {
    if (!roomId?.trim()) {
      throw new Error('Room ID is required');
    }
    
    this.queueOperation(() => {
      if (this.socket?.connected) {
        if (roomType === 'task') {
          this.socket.emit('typing_stop', { taskId: roomId, timestamp: new Date().toISOString() });
        } else {
          this.socket.emit('typing_stop', { channelId: roomId, threadRootId, timestamp: new Date().toISOString() });
        }
      }
    });
  }

  /**
   * Send channel typing indicator
   */
  startChannelTyping(channelId: string): void {
    if (!channelId?.trim()) {
      throw new Error('Channel ID is required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('channel_typing_start', { channelId, timestamp: new Date().toISOString() });
    } else {
      console.warn('Cannot start channel typing: WebSocket not connected');
    }
  }

  /**
   * Stop channel typing indicator
   */
  stopChannelTyping(channelId: string): void {
    if (!channelId?.trim()) {
      throw new Error('Channel ID is required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('channel_typing_stop', { channelId, timestamp: new Date().toISOString() });
    } else {
      console.warn('Cannot stop channel typing: WebSocket not connected');
    }
  }

  /**
   * Send channel reply typing indicator
   */
  startChannelReplyTyping(channelId: string, parentMessageId: string, parentUserName: string): void {
    if (!channelId?.trim() || !parentMessageId?.trim()) {
      throw new Error('Channel ID and parent message ID are required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('channel_reply_typing_start', { 
        channelId, 
        parentMessageId,
        parentUserName,
        timestamp: new Date().toISOString() 
      });
    } else {
      console.warn('Cannot start channel reply typing: WebSocket not connected');
    }
  }

  /**
   * Stop channel reply typing indicator
   */
  stopChannelReplyTyping(channelId: string, parentMessageId: string): void {
    if (!channelId?.trim() || !parentMessageId?.trim()) {
      throw new Error('Channel ID and parent message ID are required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('channel_reply_typing_stop', { 
        channelId, 
        parentMessageId,
        timestamp: new Date().toISOString() 
      });
    } else {
      console.warn('Cannot stop channel reply typing: WebSocket not connected');
    }
  }

  /**
   * Send presence update
   */
  updatePresence(status: 'online' | 'away' | 'busy' | 'offline'): void {
    if (!status || !['online', 'away', 'busy', 'offline'].includes(status)) {
      throw new Error('Invalid presence status');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('presence_update', { status, timestamp: new Date().toISOString() });
    } else {
      console.warn('Cannot update presence: WebSocket not connected');
    }
  }

  /**
   * Send custom message to server
   */
  emit(eventName: string, data: any): void {
    if (!eventName?.trim()) {
      throw new Error('Event name is required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn(`Cannot emit ${eventName}: WebSocket not connected`);
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection ID
   */
  getConnectionId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
    return this.connectionState;
  }
  
  /**
   * Get reconnection info
   */
  getReconnectionInfo(): { attempts: number; maxAttempts: number; isReconnecting: boolean } {
    return {
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      isReconnecting: this.connectionState === 'reconnecting',
    };
  }

  /**
   * Force reconnection
   */
  reconnect(): Promise<void> {
    if (this.isDestroyed) {
      return Promise.reject(new Error('WebSocket service has been destroyed'));
    }
    
    console.log('🔄 WebSocket: Force reconnecting...');
    this.disconnect();
    this.reconnectAttempts = 0;
    return this.connect();
  }

  /**
   * Force reconnection (alias for compatibility)
   */
  forceReconnect(): Promise<void> {
    return this.reconnect();
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    console.log('🔌 WebSocket: Disconnecting...');
    
    this.stopHeartbeat();
    this.stopSyncInterval();
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    // Clean up token change listener
    if (this.tokenUnsubscribe) {
      this.tokenUnsubscribe();
      this.tokenUnsubscribe = null;
    }
    
    this.isConnecting = false;
    this.connectionState = 'disconnected';
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.pendingOperations = [];
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.emitToListeners('disconnected', { reason: 'manual_disconnect' });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
  }
  
  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastHeartbeat = Date.now();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
        
        if (timeSinceLastHeartbeat > 30000 + this.heartbeatTimeoutMs) {
          console.warn('⚠️ WebSocket: Heartbeat timeout detected, attempting reconnection');
          this.handleReconnection();
          return;
        }
        
        this.socket.emit('ping');
      }
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Validate typing event
   */
  private validateTypingEvent(event: any): event is TypingEvent {
    return (
      event &&
      typeof event.userId === 'string' &&
      typeof event.userName === 'string' &&
      typeof event.isTyping === 'boolean' &&
      typeof event.timestamp === 'string' &&
      (event.taskId || event.channelId)
    );
  }
  
  /**
   * Validate presence event
   */
  private validatePresenceEvent(event: any): event is PresenceEvent {
    return (
      event &&
      typeof event.userId === 'string' &&
      typeof event.status === 'string' &&
      ['online', 'away', 'busy', 'offline'].includes(event.status) &&
      typeof event.timestamp === 'string'
    );
  }
  
  /**
   * Validate message event
   */
  private validateMessageEvent(event: any): event is MessageEvent {
    return (
      event &&
      typeof event.messageId === 'string' &&
      typeof event.channelId === 'string' &&
      typeof event.userId === 'string' &&
      typeof event.userName === 'string' &&
      typeof event.timestamp === 'string' &&
      ['message_sent', 'message_updated', 'message_deleted'].includes(event.type)
    );
  }
  
  /**
   * Validate message reaction event
   */
  private validateMessageReactionEvent(event: any): event is MessageReactionEvent {
    return (
      event &&
      typeof event.messageId === 'string' &&
      typeof event.channelId === 'string' &&
      typeof event.emoji === 'string' &&
      typeof event.userId === 'string' &&
      typeof event.userName === 'string' &&
      typeof event.timestamp === 'string' &&
      ['message_reaction_added', 'message_reaction_removed'].includes(event.type)
    );
  }
  
  /**
   * Validate channel typing event
   */
  private validateChannelTypingEvent(event: any): event is ChannelTypingEvent {
    return (
      event &&
      typeof event.channelId === 'string' &&
      typeof event.userId === 'string' &&
      typeof event.userName === 'string' &&
      typeof event.isTyping === 'boolean' &&
      typeof event.timestamp === 'string'
    );
  }

  /**
   * Handle comment events from task operations
   */
  private handleCommentEvent(event: CommentEvent): void {
    if (!this.validateCommentEvent(event)) {
      console.warn('Invalid comment event received:', event);
      return;
    }

    // Additional processing can be added here
    // For now, we just emit the event for listeners
    console.log(`🔄 WebSocket: Processing comment event [${event.type}]:`, event);
    
    // The event has already been emitted in setupEventHandlers
    // This method is for additional processing if needed
  }

  /**
   * Handle chat message events (task comments)
   */
  private handleChatMessageEvent(event: ChatMessageEvent): void {
    if (!this.validateChatMessageEvent(event)) {
      console.warn('Invalid chat message event received:', event);
      return;
    }

    // Additional processing for task comment messages
    console.log(`🔄 WebSocket: Processing chat message event [${event.type}]:`, event);
    
    // The event has already been emitted in setupEventHandlers  
    // This method is for additional processing if needed
  }

  /**
   * Validate comment event
   */
  private validateCommentEvent(event: any): event is CommentEvent {
    return (
      event &&
      typeof event.type === 'string' &&
      ['comment_created', 'comment_updated', 'comment_deleted'].includes(event.type) &&
      typeof event.taskId === 'string' &&
      typeof event.commentId === 'string' &&
      typeof event.userId === 'string' &&
      typeof event.timestamp === 'string'
    );
  }

  /**
   * Validate chat message event
   */
  private validateChatMessageEvent(event: any): event is ChatMessageEvent {
    return (
      event &&
      typeof event.type === 'string' &&
      ['task_comment', 'task_comment_updated', 'task_comment_deleted'].includes(event.type) &&
      typeof event.taskId === 'string' &&
      typeof event.messageId === 'string' &&
      typeof event.userId === 'string' &&
      typeof event.timestamp === 'string'
    );
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// React Hook for unified WebSocket integration
export function useWebSocket() {
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectionState, setConnectionState] = React.useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  React.useEffect(() => {
    // Initial connection state
    setIsConnected(webSocketService.isConnected());
    setConnectionState(webSocketService.getConnectionState());

    // Listen for connection changes
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionState('connected');
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
      setConnectionState('disconnected');
    };

    const unsubscribeConnect = webSocketService.on('connect', handleConnect);
    const unsubscribeDisconnect = webSocketService.on('disconnect', handleDisconnect);

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, []);

  return {
    connect: () => webSocketService.connect(),
    disconnect: () => webSocketService.disconnect(),
    isConnected,
    connectionState,
    on: <T = any>(eventName: string, listener: EventListener<T>) => webSocketService.on(eventName, listener),
    off: <T = any>(eventName: string, listener?: EventListener<T>) => webSocketService.off(eventName, listener),
    emit: (eventName: string, data: any) => webSocketService.emit(eventName, data),
    reconnect: () => webSocketService.reconnect(),
    forceReconnect: () => webSocketService.forceReconnect(),
    getConnectionId: () => webSocketService.getConnectionId(),
    
    // Channel operations
    joinChannel: (channelId: string) => webSocketService.joinChannel(channelId),
    leaveChannel: (channelId: string) => webSocketService.leaveChannel(channelId),
    
    // Task operations
    joinTask: (taskId: string) => webSocketService.joinTask(taskId),
    leaveTask: (taskId: string) => webSocketService.leaveTask(taskId),
    
    // Unified typing indicators (works for both tasks and channels)
    startTyping: (roomId: string, roomType?: 'task' | 'channel', threadRootId?: string) => 
      webSocketService.startTyping(roomId, roomType, threadRootId),
    stopTyping: (roomId: string, roomType?: 'task' | 'channel', threadRootId?: string) => 
      webSocketService.stopTyping(roomId, roomType, threadRootId),
    
    // Legacy channel typing methods (for backward compatibility)
    startChannelTyping: (channelId: string) => webSocketService.startChannelTyping(channelId),
    stopChannelTyping: (channelId: string) => webSocketService.stopChannelTyping(channelId),
    startChannelReplyTyping: (channelId: string, parentMessageId: string, parentUserName: string) => 
      webSocketService.startChannelReplyTyping(channelId, parentMessageId, parentUserName),
    stopChannelReplyTyping: (channelId: string, parentMessageId: string) => 
      webSocketService.stopChannelReplyTyping(channelId, parentMessageId),
    
    // Presence
    updatePresence: (status: 'online' | 'away' | 'busy' | 'offline') => webSocketService.updatePresence(status),
    
    // Connection info
    reconnectionInfo: webSocketService.getReconnectionInfo(),
  };
}