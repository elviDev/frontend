import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from '../config/api';

interface MessageWebSocketEvents {
  // Message Events
  message_sent: (data: {
    channelId: string;
    messageId: string;
    message: any;
    isThreadReply: boolean;
    threadRootId?: string;
  }) => void;
  
  message_updated: (data: {
    channelId: string;
    messageId: string;
    message: any;
  }) => void;
  
  message_deleted: (data: {
    channelId: string;
    messageId: string;
  }) => void;

  // Thread Events
  thread_created: (data: {
    threadRootId: string;
    channelId: string;
    createdBy: string;
  }) => void;
  
  thread_reply: (data: {
    threadRootId: string;
    replyId: string;
    channelId: string;
    reply: any;
  }) => void;
  
  thread_deleted: (data: {
    threadRootId: string;
    channelId: string;
  }) => void;

  // Reaction Events
  reaction_toggled: (data: {
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
  }) => void;
  
  reactions_cleared: (data: {
    messageId: string;
    deletedCount: number;
  }) => void;

  // Channel Events
  user_joined_channel: (data: {
    channelId: string;
    userId: string;
    user: any;
  }) => void;
  
  user_left_channel: (data: {
    channelId: string;
    userId: string;
  }) => void;
  
  typing_indicator: (data: {
    channelId: string;
    userId: string;
    isTyping: boolean;
    threadRootId?: string;
  }) => void;

  // Connection Events
  connect: () => void;
  disconnect: (reason: string) => void;
  error: (error: any) => void;
  max_reconnect_attempts_reached: () => void;
  
  // Sync Events
  sync_requested: (data: { lastSyncTime: number; channels: string[] }) => void;
  sync_response: (data: { messages: any[]; reactions: any[]; threads: any[] }) => void;
}

class MessageWebSocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectionPromise: Promise<void> | null = null;
  private isConnecting = false;
  private joinedChannels = new Set<string>();
  
  // Enhanced state management
  private lastHeartbeat = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatIntervalMs = 30000; // 30 seconds
  private heartbeatTimeoutMs = 10000; // 10 seconds timeout
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private pendingOperations: Array<() => void> = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime = 0;

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

      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      this.socket = io(WS_BASE_URL, {
        auth: {
          token,
        },
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        forceNew: true, // Always create a new connection
      });

      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 15000);

        this.socket!.on('connect', () => {
          clearTimeout(connectTimeout);
          console.log('🔌 Connected to WebSocket server');
          this.reconnectAttempts = 0;
          this.connectionState = 'connected';
          
          // Clear any pending reconnection timeout
          if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
          }
          
          // Rejoin previously joined channels
          this.joinedChannels.forEach(channelId => {
            if (this.socket?.connected) {
              this.socket.emit('join_channel', { channelId });
              console.log(`🔄 Rejoined channel: ${channelId}`);
            }
          });
          
          // Request sync from server for missed messages
          this.requestSync();
          
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(connectTimeout);
          console.error('❌ WebSocket connection error:', error);
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
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from WebSocket server:', reason);
      this.connectionState = 'disconnected';
      this.stopHeartbeat();
      this.stopSyncInterval();
      this.emit('disconnect', reason);
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect immediately
        console.log('🔄 Server initiated disconnect, attempting immediate reconnection');
        this.handleReconnection();
      } else if (reason === 'ping timeout' || reason === 'transport close') {
        // Connection lost, try to reconnect
        console.log('🔄 Connection lost, attempting reconnection');
        this.handleReconnection();
      } else if (reason !== 'io client disconnect') {
        // Other unexpected disconnections
        console.log('🔄 Unexpected disconnect, attempting reconnection');
        this.handleReconnection();
      }
    });

    this.socket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.emit('error', error);
    });

    // Message events
    this.socket.on('message_sent', (data) => {
      console.log('📨 Message sent:', data);
      this.emit('message_sent', data);
    });

    this.socket.on('message_updated', (data) => {
      console.log('✏️ Message updated:', data);
      this.emit('message_updated', data);
    });

    this.socket.on('message_deleted', (data) => {
      console.log('🗑️ Message deleted:', data);
      this.emit('message_deleted', data);
    });

    // Thread events
    this.socket.on('thread_created', (data) => {
      console.log('🧵 Thread created:', data);
      this.emit('thread_created', data);
    });

    this.socket.on('thread_reply', (data) => {
      console.log('💬 Thread reply:', data);
      this.emit('thread_reply', data);
    });

    this.socket.on('thread_deleted', (data) => {
      console.log('🗑️ Thread deleted:', data);
      this.emit('thread_deleted', data);
    });

    // Reaction events
    this.socket.on('reaction_toggled', (data) => {
      console.log('😀 Reaction toggled:', data);
      this.emit('reaction_toggled', data);
    });

    this.socket.on('reactions_cleared', (data) => {
      console.log('🧹 Reactions cleared:', data);
      this.emit('reactions_cleared', data);
    });

    // Channel events
    this.socket.on('user_joined_channel', (data) => {
      console.log('👋 User joined channel:', data);
      this.emit('user_joined_channel', data);
    });

    this.socket.on('user_left_channel', (data) => {
      console.log('👋 User left channel:', data);
      this.emit('user_left_channel', data);
    });

    this.socket.on('typing_indicator', (data) => {
      this.emit('typing_indicator', data);
    });
    
    // Heartbeat/ping response
    this.socket.on('pong', () => {
      this.lastHeartbeat = Date.now();
    });
    
    // Sync events
    this.socket.on('sync_response', (data) => {
      console.log('🔄 Received sync response:', data);
      this.emit('sync_response', data);
    });
  }
  
  private startHeartbeat(): void {
    // Clear existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.lastHeartbeat = Date.now();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        // Check if last heartbeat was too long ago
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
        
        if (timeSinceLastHeartbeat > this.heartbeatIntervalMs + this.heartbeatTimeoutMs) {
          console.warn('⚠️ Heartbeat timeout detected, attempting reconnection');
          this.handleReconnection();
          return;
        }
        
        // Send ping
        this.socket.emit('ping');
      }
    }, this.heartbeatIntervalMs);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.connectionState = 'disconnected';
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    // Don't start multiple reconnection attempts
    if (this.connectionState === 'reconnecting' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${Math.round(delay)}ms`);
    
    this.reconnectTimeoutId = setTimeout(async () => {
      try {
        await this.connect();
        console.log('✅ Reconnection successful');
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        
        // Continue trying if we haven't reached max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnection();
        } else {
          this.connectionState = 'disconnected';
        }
      }
    }, delay);
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket...');
    
    // Clear all timers and intervals
    this.stopHeartbeat();
    this.stopSyncInterval();
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    // Clear all state
    this.isConnecting = false;
    this.connectionState = 'disconnected';
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.pendingOperations = [];
    
    // Disconnect socket but keep channels and listeners for potential reconnection
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event subscription methods
  on<K extends keyof MessageWebSocketEvents>(
    event: K,
    listener: MessageWebSocketEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off<K extends keyof MessageWebSocketEvents>(
    event: K,
    listener: MessageWebSocketEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  // Channel operations
  joinChannel(channelId: string): void {
    this.joinedChannels.add(channelId);
    
    if (this.socket?.connected) {
      this.socket.emit('join_channel', { channelId });
      console.log(`🏠 Joined channel: ${channelId}`);
    } else {
      console.log(`📝 Queued channel join: ${channelId} (will join when connected)`);
    }
  }

  leaveChannel(channelId: string): void {
    this.joinedChannels.delete(channelId);
    
    if (this.socket?.connected) {
      this.socket.emit('leave_channel', { channelId });
      console.log(`🚪 Left channel: ${channelId}`);
    }
  }

  // Enhanced typing indicators with queuing
  startTyping(channelId: string, threadRootId?: string): void {
    this.queueOperation(() => {
      if (this.socket?.connected) {
        this.socket.emit('typing_start', { channelId, threadRootId });
      }
    });
  }

  stopTyping(channelId: string, threadRootId?: string): void {
    this.queueOperation(() => {
      if (this.socket?.connected) {
        this.socket.emit('typing_stop', { channelId, threadRootId });
      }
    });
  }
  
  // Force reconnection (for manual retry)
  forceReconnect(): Promise<void> {
    console.log('🔄 Force reconnecting WebSocket...');
    this.disconnect();
    this.reconnectAttempts = 0; // Reset attempts for manual reconnection
    return this.connect();
  }

  // Enhanced connection and sync management
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
      };
      
      console.log('🔄 Requesting sync for missed updates:', syncData);
      this.socket.emit('request_sync', syncData);
    }
    
    this.lastSyncTime = Date.now();
  }
  
  private startSyncInterval(): void {
    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Update last sync time every 5 minutes
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
  
  // Queue operation for when connection is restored
  private queueOperation(operation: () => void): void {
    if (this.socket?.connected) {
      operation();
    } else {
      this.pendingOperations.push(operation);
      console.log('📝 Queued operation for when connection is restored');
    }
  }

  // Connection status
  get isConnected(): boolean {
    return this.socket?.connected || false;
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
}

export const messageWebSocketService = new MessageWebSocketService();
export default messageWebSocketService;