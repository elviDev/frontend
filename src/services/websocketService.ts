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
  | 'user_typing'
  | 'presence_update'
  | 'message_sent'
  | 'message_updated'
  | 'message_deleted'
  | 'message_reaction_added'
  | 'message_reaction_removed';

export type TaskActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'assign' 
  | 'unassign'
  | 'complete' 
  | 'status_change'
  | 'priority_change'
  | 'comment';

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
  taskId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
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
  connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.socket?.connected || this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;
      
      const serverUrl = this.config.url;
      
      // Get token for initial connection
      const token = await tokenManager.getCurrentToken();
      
      console.log('🔌 WebSocket: Connecting with token in auth:', {
        serverUrl,
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      });
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        // Include token in connection auth for backend authentication middleware
        auth: {
          token: token
        }
      });

      // Listen for token changes to automatically re-authenticate
      if (!this.tokenUnsubscribe) {
        this.tokenUnsubscribe = tokenManager.onTokenChange((newToken) => {
          console.log('🔄 WebSocket: Token changed, reconnecting with new token...', !!newToken);
          if (newToken) {
            // Reconnect with new token (disconnect and reconnect with new auth)
            if (this.socket?.connected) {
              this.disconnect();
              // Reconnect after a short delay
              setTimeout(() => this.connect(), 1000);
            }
          } else {
            // Token was cleared, disconnect
            this.disconnect();
          }
        });
      }

      // Connection events
      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected with authentication');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        // Authentication happens automatically during connection via auth parameter
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.isConnecting = false;
        this.stopHeartbeat();
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          return;
        }
        
        // Auto-reconnect for other reasons
        this.scheduleReconnect();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error.message);
        console.log('🔍 WebSocket connection details:', {
          serverUrl,
          hasToken: !!token,
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
          errorType: error.constructor.name,
          errorMessage: error.message
        });
        this.isConnecting = false;
        this.scheduleReconnect();
        reject(error);
      });

      // Task-specific events
      this.socket.on('task_update', (event: TaskUpdateEvent) => {
        this.handleTaskUpdate(event);
      });

      // Notification events
      this.socket.on('notification', (notification: NotificationEvent) => {
        this.handleNotification(notification);
      });
      
      // Typing events
      this.socket.on('user_typing', (event: TypingEvent) => {
        if (this.validateTypingEvent(event)) {
          this.emitToListeners('user_typing', event);
        }
      });
      
      // Presence events
      this.socket.on('presence_update', (event: PresenceEvent) => {
        if (this.validatePresenceEvent(event)) {
          this.emitToListeners('presence_update', event);
        }
      });
      
      // Message events
      this.socket.on('message_sent', (event: MessageEvent) => {
        if (this.validateMessageEvent(event)) {
          this.emitToListeners('message_sent', event);
        }
      });
      
      this.socket.on('message_updated', (event: MessageEvent) => {
        if (this.validateMessageEvent(event)) {
          this.emitToListeners('message_updated', event);
        }
      });
      
      this.socket.on('message_deleted', (event: MessageEvent) => {
        if (this.validateMessageEvent(event)) {
          this.emitToListeners('message_deleted', event);
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

      // Generic event handler for custom listeners
      this.socket.onAny((eventName: string, ...args: any[]) => {
        this.emitToListeners(eventName, args.length === 1 ? args[0] : args);
      });
    });
  }

  // NOTE: Authentication now happens automatically during connection via the auth parameter
  // No separate authenticate() method needed since backend middleware handles it

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect().catch(console.error);
    }, this.reconnectInterval * this.reconnectAttempts);
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
   * Send typing indicator for task comments
   */
  startTyping(taskId: string): void {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { taskId, timestamp: new Date().toISOString() });
    } else {
      console.warn('Cannot start typing: WebSocket not connected');
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(taskId: string): void {
    if (!taskId?.trim()) {
      throw new Error('Task ID is required');
    }
    
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { taskId, timestamp: new Date().toISOString() });
    } else {
      console.warn('Cannot stop typing: WebSocket not connected');
    }
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
   * Force reconnection
   */
  reconnect(): Promise<void> {
    if (this.isDestroyed) {
      return Promise.reject(new Error('WebSocket service has been destroyed'));
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
      return Promise.resolve();
    } else {
      return this.connect();
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    // Clean up token change listener
    if (this.tokenUnsubscribe) {
      this.tokenUnsubscribe();
      this.tokenUnsubscribe = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
    
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.connectionPromise = null;
    this.eventListeners.clear();
    
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
      const now = Date.now();
      if (now - this.lastHeartbeat > 30000) { // 30 seconds timeout
        console.warn('WebSocket heartbeat timeout, reconnecting...');
        this.reconnect();
      }
    }, 15000); // Check every 15 seconds
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
      typeof event.taskId === 'string' &&
      typeof event.userId === 'string' &&
      typeof event.userName === 'string' &&
      typeof event.isTyping === 'boolean' &&
      typeof event.timestamp === 'string'
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
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// React Hook for WebSocket integration
export function useWebSocket() {
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    // Initial connection state
    setIsConnected(webSocketService.isConnected());

    // Listen for connection changes
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    webSocketService.on('connect', handleConnect);
    webSocketService.on('disconnect', handleDisconnect);

    return () => {
      webSocketService.off('connect', handleConnect);
      webSocketService.off('disconnect', handleDisconnect);
    };
  }, []);

  return {
    connect: () => webSocketService.connect(),
    disconnect: () => webSocketService.disconnect(),
    isConnected,
    on: <T = any>(eventName: string, listener: EventListener<T>) => webSocketService.on(eventName, listener),
    off: <T = any>(eventName: string, listener?: EventListener<T>) => webSocketService.off(eventName, listener),
    emit: (eventName: string, data: any) => webSocketService.emit(eventName, data),
    reconnect: () => webSocketService.reconnect(),
    getConnectionId: () => webSocketService.getConnectionId(),
    joinChannel: (channelId: string) => webSocketService.joinChannel(channelId),
    leaveChannel: (channelId: string) => webSocketService.leaveChannel(channelId),
    joinTask: (taskId: string) => webSocketService.joinTask(taskId),
    leaveTask: (taskId: string) => webSocketService.leaveTask(taskId),
    startTyping: (taskId: string) => webSocketService.startTyping(taskId),
    stopTyping: (taskId: string) => webSocketService.stopTyping(taskId),
    startChannelTyping: (channelId: string) => webSocketService.startChannelTyping(channelId),
    stopChannelTyping: (channelId: string) => webSocketService.stopChannelTyping(channelId),
    startChannelReplyTyping: (channelId: string, parentMessageId: string, parentUserName: string) => 
      webSocketService.startChannelReplyTyping(channelId, parentMessageId, parentUserName),
    stopChannelReplyTyping: (channelId: string, parentMessageId: string) => 
      webSocketService.stopChannelReplyTyping(channelId, parentMessageId),
    updatePresence: (status: 'online' | 'away' | 'busy' | 'offline') => webSocketService.updatePresence(status),
  };
}