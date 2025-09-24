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

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type WebSocketEventType =
  | 'task_created' | 'task_updated' | 'task_completed' | 'task_deleted'
  | 'task_assigned' | 'task_status_changed' | 'comment_added'
  | 'user_typing' | 'presence_update'
  | 'message_sent' | 'message_updated' | 'message_deleted'
  | 'message_reaction_added' | 'message_reaction_removed'
  | 'thread_created' | 'thread_reply' | 'thread_deleted'
  | 'reaction_toggled' | 'reactions_cleared'
  | 'user_joined_channel' | 'user_left_channel' | 'typing_indicator'
  | 'connect' | 'disconnect' | 'error' | 'max_reconnect_attempts_reached'
  | 'sync_requested' | 'sync_response';

export interface TaskUpdateEvent {
  type: WebSocketEventType;
  taskId: string;
  channelId?: string;
  task: Task;
  action: 'create' | 'update' | 'delete' | 'assign' | 'unassign' | 'complete' | 'status_change' | 'priority_change' | 'comment';
  changes?: Partial<Task>;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
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
  replyId?: string;
  reply?: any;
  createdBy?: string;
}

export interface ReactionEvent {
  type: 'reaction_toggled' | 'reactions_cleared';
  messageId: string;
  channelId?: string;
  emoji?: string;
  action?: 'added' | 'removed';
  userId?: string;
  userName?: string;
  timestamp: string;
  currentReactions?: Array<{
    emoji: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
      avatar_url?: string;
    }>;
  }>;
  deletedCount?: number;
}

export interface TypingEvent {
  channelId: string;
  taskId?: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
  threadRootId?: string;
}

export interface PresenceEvent {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  timestamp: string;
}

export interface NotificationEvent {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  userId?: string;
  channelId?: string;
  taskId?: string;
  read: boolean;
}

export interface ChannelEvent {
  type: 'user_joined_channel' | 'user_left_channel';
  channelId: string;
  userId: string;
  user?: any;
}

export interface SyncEvent {
  type: 'sync_requested' | 'sync_response';
  lastSyncTime?: number;
  channels?: string[];
  messages?: any[];
  reactions?: any[];
  threads?: any[];
}

export type EventListener<T = any> = (data: T) => void;

export interface WebSocketConnectionConfig {
  url: string;
  timeout: number;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  transports: ('websocket' | 'polling')[];
}

// =============================================================================
// UNIFIED WEBSOCKET SERVICE
// =============================================================================

class UnifiedWebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private isConnecting = false;
  private eventListeners = new Map<string, Set<EventListener>>();
  private connectionPromise: Promise<void> | null = null;
  private isDestroyed = false;
  private tokenUnsubscribe: (() => void) | null = null;

  // Enhanced connection management
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = 0;
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private pendingOperations: Array<() => void> = [];

  // Channel and room management
  private joinedChannels = new Set<string>();
  private joinedTasks = new Set<string>();

  // Sync management
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime = 0;

  private config: WebSocketConnectionConfig;

  constructor(config?: Partial<WebSocketConnectionConfig>) {
    const wsUrl = WS_BASE_URL.replace('/api/v1', '');

    this.config = {
      url: wsUrl,
      timeout: 20000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      ...config
    };

    this.maxReconnectAttempts = this.config.reconnectionAttempts;
    this.connect();
  }

  // =============================================================================
  // CONNECTION MANAGEMENT
  // =============================================================================

  async connect(): Promise<void> {
    // Return existing connection if already connected
    if (this.socket?.connected && this.connectionState === 'connected') {
      console.log('📡 Already connected to WebSocket');
      return;
    }

    // Return existing connection promise if already connecting
    if ((this.isConnecting || this.connectionState === 'connecting') && this.connectionPromise) {
      console.log('📡 Connection already in progress, waiting...');
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

      // Execute any pending operations
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

      console.log('🔌 WebSocket: Connecting with token auth:', {
        serverUrl: this.config.url,
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      });

      this.socket = io(this.config.url, {
        transports: this.config.transports,
        timeout: this.config.timeout,
        reconnection: true,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        forceNew: true,
        auth: {
          token: token
        }
      });

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

      this.setupEventHandlers();

      return new Promise((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 15000);

        this.socket!.on('connect', () => {
          clearTimeout(connectTimeout);
          console.log('✅ WebSocket connected with authentication');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionState = 'connected';

          // Clear any pending reconnection timeout
          if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
          }

          // Rejoin previously joined channels and tasks
          this.rejoinRooms();

          // Request sync from server for missed messages
          this.requestSync();

          this.emitToListeners('connect');
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(connectTimeout);
          console.error('❌ WebSocket connection error:', error.message);
          console.log('🔍 Connection details:', {
            serverUrl: this.config.url,
            hasToken: !!token,
            tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
            errorType: error.constructor.name,
            errorMessage: error.message
          });
          this.isConnecting = false;
          this.scheduleReconnect();
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ Failed to connect to WebSocket:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.emitToListeners('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from WebSocket server:', reason);
      this.connectionState = 'disconnected';
      this.stopHeartbeat();
      this.stopSyncInterval();
      this.emitToListeners('disconnect', reason);

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

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.emitToListeners('error', error);
    });

    // Task events
    this.socket.on('task_update', (event: TaskUpdateEvent) => {
      this.handleTaskUpdate(event);
    });

    // Notification events
    this.socket.on('notification', (notification: NotificationEvent) => {
      this.handleNotification(notification);
    });

    // Message events
    this.socket.on('message_sent', (data) => {
      console.log('📨 Message sent event received:', data);
      this.emitToListeners('message_sent', data);
    });

    this.socket.on('message_updated', (data) => {
      console.log('✏️ Message updated event received:', data);
      this.emitToListeners('message_updated', data);
    });

    this.socket.on('message_deleted', (data) => {
      console.log('🗑️ Message deleted event received:', data);
      this.emitToListeners('message_deleted', data);
    });

    // Thread events
    this.socket.on('thread_created', (data) => {
      console.log('🧵 Thread created:', data);
      this.emitToListeners('thread_created', data);
    });

    this.socket.on('thread_reply', (data) => {
      console.log('💬 Thread reply:', data);
      this.emitToListeners('thread_reply', data);
    });

    this.socket.on('thread_deleted', (data) => {
      console.log('🗑️ Thread deleted:', data);
      this.emitToListeners('thread_deleted', data);
    });

    // Reaction events
    this.socket.on('reaction_toggled', (data) => {
      console.log('😀 Reaction toggled:', data);
      this.emitToListeners('reaction_toggled', data);
    });

    this.socket.on('reactions_cleared', (data) => {
      console.log('🧹 Reactions cleared:', data);
      this.emitToListeners('reactions_cleared', data);
    });

    // Channel events
    this.socket.on('user_joined_channel', (data) => {
      console.log('👋 User joined channel:', data);
      this.emitToListeners('user_joined_channel', data);
    });

    this.socket.on('user_left_channel', (data) => {
      console.log('👋 User left channel:', data);
      this.emitToListeners('user_left_channel', data);
    });

    // Typing events
    this.socket.on('user_typing', (event: TypingEvent) => {
      if (this.validateTypingEvent(event)) {
        this.emitToListeners('user_typing', event);
      }
    });

    this.socket.on('typing_indicator', (data) => {
      this.emitToListeners('typing_indicator', data);
    });

    // Presence events
    this.socket.on('presence_update', (event: PresenceEvent) => {
      if (this.validatePresenceEvent(event)) {
        this.emitToListeners('presence_update', event);
      }
    });

    // Heartbeat/ping response
    this.socket.on('pong', () => {
      this.lastHeartbeat = Date.now();
    });

    // Sync events
    this.socket.on('sync_response', (data) => {
      console.log('🔄 Received sync response:', data);
      this.emitToListeners('sync_response', data);
    });

    // Generic event handler for custom listeners
    this.socket.onAny((eventName: string, ...args: any[]) => {
      this.emitToListeners(eventName, args.length === 1 ? args[0] : args);
    });
  }

  // =============================================================================
  // RECONNECTION MANAGEMENT
  // =============================================================================

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emitToListeners('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect().catch(console.error);
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.connectionState = 'disconnected';
      this.emitToListeners('max_reconnect_attempts_reached');
      return;
    }

    if (this.connectionState === 'reconnecting' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;

    const baseDelay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, 30000);

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(delay)}ms`);

    this.reconnectTimeoutId = setTimeout(async () => {
      try {
        await this.connect();
        console.log('✅ Reconnection successful');
      } catch (error) {
        console.error('❌ Reconnection failed:', error);

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnection();
        } else {
          this.connectionState = 'disconnected';
        }
      }
    }, delay);
  }

  // =============================================================================
  // ROOM MANAGEMENT
  // =============================================================================

  joinChannel(channelId: string): void {
    if (!channelId?.trim()) {
      throw new Error('Channel ID is required');
    }

    this.joinedChannels.add(channelId);

    this.queueOperation(() => {
      if (this.socket?.connected) {
        this.socket.emit('join_channel', { channelId });
        console.log(`🏠 Joined channel: ${channelId}`);
      }
    });
  }

  leaveChannel(channelId: string): void {
    if (!channelId?.trim()) {
      throw new Error('Channel ID is required');
    }

    this.joinedChannels.delete(channelId);

    if (this.socket?.connected) {
      this.socket.emit('leave_channel', { channelId });
      console.log(`🚪 Left channel: ${channelId}`);
    }
  }

  joinTask(taskId: string): void {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }

    this.joinedTasks.add(taskId);

    this.queueOperation(() => {
      if (this.socket?.connected) {
        this.socket.emit('join_task', { taskId });
        console.log(`📋 Joined task: ${taskId}`);
      }
    });
  }

  leaveTask(taskId: string): void {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }

    this.joinedTasks.delete(taskId);

    if (this.socket?.connected) {
      this.socket.emit('leave_task', { taskId });
      console.log(`📋 Left task: ${taskId}`);
    }
  }

  private rejoinRooms(): void {
    // Rejoin previously joined channels
    this.joinedChannels.forEach(channelId => {
      if (this.socket?.connected) {
        this.socket.emit('join_channel', { channelId });
        console.log(`🔄 Rejoined channel: ${channelId}`);
      }
    });

    // Rejoin previously joined tasks
    this.joinedTasks.forEach(taskId => {
      if (this.socket?.connected) {
        this.socket.emit('join_task', { taskId });
        console.log(`🔄 Rejoined task: ${taskId}`);
      }
    });
  }

  // =============================================================================
  // EVENT MANAGEMENT
  // =============================================================================

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

  // =============================================================================
  // TYPING INDICATORS
  // =============================================================================

  startTyping(channelId: string, taskId?: string, threadRootId?: string): void {
    this.queueOperation(() => {
      if (this.socket?.connected) {
        if (channelId) {
          this.socket.emit('channel_typing_start', { channelId, threadRootId, timestamp: new Date().toISOString() });
        }
        if (taskId) {
          this.socket.emit('typing_start', { taskId, timestamp: new Date().toISOString() });
        }
      }
    });
  }

  stopTyping(channelId: string, taskId?: string, threadRootId?: string): void {
    this.queueOperation(() => {
      if (this.socket?.connected) {
        if (channelId) {
          this.socket.emit('channel_typing_stop', { channelId, threadRootId, timestamp: new Date().toISOString() });
        }
        if (taskId) {
          this.socket.emit('typing_stop', { taskId, timestamp: new Date().toISOString() });
        }
      }
    });
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  emit(eventName: string, data: any): void {
    if (!eventName?.trim()) {
      throw new Error('Event name is required');
    }

    this.queueOperation(() => {
      if (this.socket?.connected) {
        this.socket.emit(eventName, data);
      }
    });
  }

  updatePresence(status: 'online' | 'away' | 'busy' | 'offline'): void {
    if (!status || !['online', 'away', 'busy', 'offline'].includes(status)) {
      throw new Error('Invalid presence status');
    }

    this.queueOperation(() => {
      if (this.socket?.connected) {
        this.socket.emit('presence_update', { status, timestamp: new Date().toISOString() });
      }
    });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionId(): string | null {
    return this.socket?.id || null;
  }

  get getConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
    return this.connectionState;
  }

  get reconnectionInfo(): { attempts: number; maxAttempts: number; isReconnecting: boolean } {
    return {
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      isReconnecting: this.connectionState === 'reconnecting',
    };
  }

  forceReconnect(): Promise<void> {
    console.log('🔄 Force reconnecting WebSocket...');
    this.disconnect();
    this.reconnectAttempts = 0;
    return this.connect();
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket...');

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

    // Clear all state
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

  destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.eventListeners.clear();
    this.joinedChannels.clear();
    this.joinedTasks.clear();
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

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

  private handleNotification(notification: NotificationEvent): void {
    console.log('Notification received:', notification);
    this.emitToListeners('notification', notification);
    this.showLocalNotification(notification);
  }

  private async showLocalNotification(notification: NotificationEvent): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if ((window as any).Notification.permission === 'granted') {
          const notif = new (window as any).Notification(notification.title, {
            body: notification.message,
            icon: '/icon.png',
            tag: notification.notificationId,
            data: notification.data,
            requireInteraction: notification.priority === 'critical',
          });

          if (notification.priority !== 'critical') {
            setTimeout(() => notif.close(), 5000);
          }
        }
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastHeartbeat = Date.now();

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;

        if (timeSinceLastHeartbeat > 75000) { // 75 seconds timeout
          console.warn('⚠️ Heartbeat timeout detected, attempting reconnection');
          this.handleReconnection();
          return;
        }

        this.socket.emit('ping');
      }
    }, 60000); // Send ping every 60 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private executePendingOperations(): void {
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    operations.forEach(operation => {
      try {
        operation();
      } catch (error) {
        console.error('❌ Error executing pending operation:', error);
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

      console.log('🔄 Requesting sync for missed updates:', syncData);
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
    }, 5 * 60 * 1000);
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
      console.log('📝 Queued operation for when connection is restored');
    }
  }

  private validateTypingEvent(event: any): event is TypingEvent {
    return (
      event &&
      typeof event.userId === 'string' &&
      typeof event.userName === 'string' &&
      typeof event.isTyping === 'boolean' &&
      typeof event.timestamp === 'string' &&
      (typeof event.taskId === 'string' || typeof event.channelId === 'string')
    );
  }

  private validatePresenceEvent(event: any): event is PresenceEvent {
    return (
      event &&
      typeof event.userId === 'string' &&
      typeof event.status === 'string' &&
      ['online', 'away', 'busy', 'offline'].includes(event.status) &&
      typeof event.timestamp === 'string'
    );
  }
}

// =============================================================================
// SINGLETON INSTANCE AND REACT HOOK
// =============================================================================

export const unifiedWebSocketService = new UnifiedWebSocketService();

export function useUnifiedWebSocket() {
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectionState, setConnectionState] = React.useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  React.useEffect(() => {
    // Initial connection state
    setIsConnected(unifiedWebSocketService.isConnected());
    setConnectionState(unifiedWebSocketService.getConnectionState);

    // Listen for connection changes
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionState('connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setConnectionState('disconnected');
    };

    const unsubscribeConnect = unifiedWebSocketService.on('connect', handleConnect);
    const unsubscribeDisconnect = unifiedWebSocketService.on('disconnect', handleDisconnect);

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, []);

  return {
    // Connection management
    connect: () => unifiedWebSocketService.connect(),
    disconnect: () => unifiedWebSocketService.disconnect(),
    forceReconnect: () => unifiedWebSocketService.forceReconnect(),

    // Connection state
    isConnected,
    connectionState,
    reconnectionInfo: unifiedWebSocketService.reconnectionInfo,
    getConnectionId: () => unifiedWebSocketService.getConnectionId(),

    // Event management
    on: <T = any>(eventName: string, listener: EventListener<T>) => unifiedWebSocketService.on(eventName, listener),
    off: <T = any>(eventName: string, listener?: EventListener<T>) => unifiedWebSocketService.off(eventName, listener),
    emit: (eventName: string, data: any) => unifiedWebSocketService.emit(eventName, data),

    // Room management
    joinChannel: (channelId: string) => unifiedWebSocketService.joinChannel(channelId),
    leaveChannel: (channelId: string) => unifiedWebSocketService.leaveChannel(channelId),
    joinTask: (taskId: string) => unifiedWebSocketService.joinTask(taskId),
    leaveTask: (taskId: string) => unifiedWebSocketService.leaveTask(taskId),

    // Typing indicators
    startTyping: (channelId: string, taskId?: string, threadRootId?: string) =>
      unifiedWebSocketService.startTyping(channelId, taskId, threadRootId),
    stopTyping: (channelId: string, taskId?: string, threadRootId?: string) =>
      unifiedWebSocketService.stopTyping(channelId, taskId, threadRootId),

    // Presence management
    updatePresence: (status: 'online' | 'away' | 'busy' | 'offline') => unifiedWebSocketService.updatePresence(status),
  };
}

export default unifiedWebSocketService;