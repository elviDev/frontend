import { Message } from '../../types/chat';
import { tokenManager } from '../tokenManager';
import { API_BASE_URL } from '../../config/api';

// Backend database message structure
export interface BackendMessage {
  id: string;
  channel_id: string;
  task_id?: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
  user_role?: string;
  content: string;
  message_type: 'text' | 'voice' | 'file' | 'system' | 'command_result' | 'ai_response';
  voice_data?: Record<string, any>;
  transcription?: string;
  attachments: any[];
  reply_to?: string;
  thread_root?: string;
  is_edited: boolean;
  is_pinned: boolean;
  is_announcement: boolean;
  reactions: Record<string, any>;
  mentions: string[];
  ai_generated: boolean;
  ai_context?: Record<string, any>;
  command_execution_id?: string;
  metadata: Record<string, any>;
  formatting: Record<string, any>;
  reply_count?: number;
  last_reply_timestamp?: string;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  deleted_at?: string;
  deleted_by?: string;
  deleted_by_name?: string;
}

export interface MessageListResponse {
  success: boolean;
  data: BackendMessage[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: string;
}

export interface SendMessageRequest {
  content: string;
  message_type?: 'text' | 'voice' | 'file' | 'system';
  reply_to?: string;
  thread_root?: string;
  mentions?: string[];
  attachments?: Array<{
    file_id: string;
    filename: string;
    file_type: string;
    file_size: number;
  }>;
  voice_data?: {
    duration: number;
    transcript?: string;
    voice_file_id?: string;
  };
}

export interface BackendMessageResponse {
  success: boolean;
  data: BackendMessage;
  timestamp: string;
}

export interface MessageResponse {
  success: boolean;
  data: Message;
  timestamp: string;
}

class MessageService {
  private baseUrl: string;

  constructor() {


    this.baseUrl = API_BASE_URL;
    console.log('📱 MessageService initialized with:', {
      API_BASE_URL: API_BASE_URL,
      finalBaseUrl: this.baseUrl
    });
  }

  /**
   * Transform backend message to frontend Message interface
   */
  private transformMessage(backendMsg: BackendMessage): Message {
    return {
      id: backendMsg.id,
      type: this.mapMessageType(backendMsg.message_type),
      content: backendMsg.content,
      voiceTranscript: backendMsg.transcription,
      audioUri: backendMsg.voice_data?.audio_url,
      fileUrl: backendMsg.attachments?.[0]?.url,
      fileName: backendMsg.attachments?.[0]?.filename,
      sender: {
        id: backendMsg.user_id,
        name: backendMsg.user_name || 'Unknown User',
        avatar: backendMsg.user_avatar,
        role: backendMsg.user_role || 'staff',
      },
      timestamp: new Date(backendMsg.created_at),
      reactions: this.transformReactions(backendMsg.reactions),
      replies: [], // Will be populated separately for thread views
      mentions: Array.isArray(backendMsg.mentions) ? backendMsg.mentions : [],
      isEdited: backendMsg.is_edited,
      
      // Delete support
      deletedBy: backendMsg.deleted_by_name,
      deletedAt: backendMsg.deleted_at ? new Date(backendMsg.deleted_at) : undefined,
      
      // Threading support
      connectedTo: backendMsg.reply_to,
      threadRoot: backendMsg.thread_root,
      replyCount: backendMsg.reply_count || backendMsg.metadata?.reply_count || 0,
      lastReplyTimestamp: backendMsg.last_reply_timestamp 
        ? new Date(backendMsg.last_reply_timestamp)
        : backendMsg.metadata?.last_reply_timestamp 
        ? new Date(backendMsg.metadata.last_reply_timestamp) 
        : undefined,
      
      aiSummary: backendMsg.ai_context?.summary,
      taskAssignments: [], // TODO: Extract from metadata if needed
    };
  }

  /**
   * Map backend message types to frontend types
   */
  private mapMessageType(backendType: string): Message['type'] {
    switch (backendType) {
      case 'text': return 'text';
      case 'voice': return 'voice';
      case 'file': return 'file';
      case 'system': return 'system';
      case 'command_result': return 'system';
      case 'ai_response': return 'system';
      default: return 'text';
    }
  }

  /**
   * Transform backend reactions to frontend format
   */
  private transformReactions(backendReactions: Record<string, any>): Message['reactions'] {
    if (!backendReactions || typeof backendReactions !== 'object') {
      return [];
    }

    return Object.entries(backendReactions).map(([emoji, users]) => ({
      emoji,
      users: Array.isArray(users) ? users : [],
      count: Array.isArray(users) ? users.length : 0,
    }));
  }

  /**
   * Get messages for a specific channel
   */
  async getChannelMessages(
    channelId: string,
    options: {
      limit?: number;
      offset?: number;
      thread_root?: string;
      search?: string;
      message_type?: string;
      before?: string;
      after?: string;
    } = {}
  ): Promise<{
    success: boolean;
    data: {
      messages: Message[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    };
    timestamp: string;
  }> {
    try {
      console.log('🔄 Getting access token for message retrieval...');
      const token = await tokenManager.getCurrentToken();
      console.log('🔐 Token status:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
      });
      
      if (!token) {
        // Get detailed token info for debugging
        const tokenInfo = await tokenManager.getTokenInfo();
        console.error('❌ No authentication token available:', tokenInfo);
        throw new Error(`No authentication token available. Token info: ${JSON.stringify(tokenInfo)}`);
      }

      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.thread_root) params.append('thread_root', options.thread_root);
      if (options.search) params.append('search', options.search);
      if (options.message_type) params.append('message_type', options.message_type);
      if (options.before) params.append('before', options.before);
      if (options.after) params.append('after', options.after);

      const queryString = params.toString();
      const url = `${this.baseUrl}/channels/${channelId}/messages${queryString ? '?' + queryString : ''}`;

      console.log('💬 Fetching channel messages:', { channelId, url, options });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch channel messages:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: url,
          token: token ? `${token.substring(0, 20)}...` : 'none',
        });
        throw new Error(`Failed to fetch channel messages: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const backendResponse: MessageListResponse = await response.json();
      
      // Transform backend messages to frontend format
      const transformedMessages = backendResponse.data.map(msg => this.transformMessage(msg));

      console.log('✅ Channel messages fetched successfully:', {
        messagesCount: transformedMessages.length,
        hasMore: backendResponse.pagination.hasMore,
      });

      // Return in the format expected by ChannelDetailScreen
      return {
        success: backendResponse.success,
        data: {
          messages: transformedMessages,
          pagination: backendResponse.pagination,
        },
        timestamp: backendResponse.timestamp,
      };
    } catch (error) {
      console.error('❌ Error fetching channel messages:', error);
      throw error;
    }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(
    channelId: string,
    messageData: SendMessageRequest
  ): Promise<MessageResponse> {
    try {
      const token = await tokenManager.getCurrentToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const url = `${this.baseUrl}/channels/${channelId}/messages`;

      console.log('📤 Sending message:', { channelId, messageData });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to send message:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }

      const backendData: BackendMessageResponse = await response.json();
      console.log('✅ Message sent successfully:', backendData);

      // Transform backend message to frontend format
      const transformedMessage = this.transformMessage(backendData.data);

      return {
        success: backendData.success,
        data: transformedMessage,
        timestamp: backendData.timestamp,
      };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * Edit a message
   */
  async editMessage(
    channelId: string,
    messageId: string,
    content: string
  ): Promise<MessageResponse> {
    try {
      const token = await tokenManager.getCurrentToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const url = `${this.baseUrl}/channels/${channelId}/messages/${messageId}`;

      console.log('✏️ Editing message:', { channelId, messageId, content });

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to edit message:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to edit message: ${response.status} ${response.statusText}`);
      }

      const backendData: BackendMessageResponse = await response.json();
      console.log('✅ Message edited successfully:', backendData);

      // Transform backend message to frontend format
      const transformedMessage = this.transformMessage(backendData.data);

      return {
        success: backendData.success,
        data: transformedMessage,
        timestamp: backendData.timestamp,
      };
    } catch (error) {
      console.error('❌ Error editing message:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(channelId: string, messageId: string): Promise<{ success: boolean }> {
    try {
      const token = await tokenManager.getCurrentToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const url = `${this.baseUrl}/channels/${channelId}/messages/${messageId}`;

      console.log('🗑️ Deleting message:', { channelId, messageId });

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to delete message:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to delete message: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Message deleted successfully:', data);

      return data;
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Get thread messages for a specific message
   */
  async getThreadMessages(
    channelId: string,
    messageId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    success: boolean;
    data: {
      parentMessage: Message;
      replies: Message[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    };
    timestamp: string;
  }> {
    try {
      console.log('🧵 Getting thread messages:', { channelId, messageId, options });
      const token = await tokenManager.getCurrentToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());

      const queryString = params.toString();
      const url = `${this.baseUrl}/channels/${channelId}/messages/${messageId}/thread${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Thread response received:', {
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch thread messages:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to fetch thread messages: ${response.status} ${response.statusText}`);
      }

      const backendResponse = await response.json();
      
      // Transform backend messages to frontend format
      const transformedParent = this.transformMessage(backendResponse.data.parentMessage);
      const transformedReplies = backendResponse.data.replies.map((msg: BackendMessage) => this.transformMessage(msg));

      console.log('✅ Thread messages fetched successfully:', {
        parentMessage: transformedParent.id,
        repliesCount: transformedReplies.length,
      });

      return {
        success: backendResponse.success,
        data: {
          parentMessage: transformedParent,
          replies: transformedReplies,
          pagination: backendResponse.data.pagination,
        },
        timestamp: backendResponse.timestamp,
      };
    } catch (error) {
      console.error('❌ Error fetching thread messages:', error);
      throw error;
    }
  }

  /**
   * Send a reply to a message (thread)
   */
  async sendReply(
    channelId: string,
    parentMessageId: string,
    messageData: Omit<SendMessageRequest, 'reply_to' | 'thread_root'>
  ): Promise<MessageResponse> {
    try {
      const token = await tokenManager.getCurrentToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Get the parent message to determine thread root
      const parentMessage = await this.getThreadMessages(channelId, parentMessageId, { limit: 1 });
      const threadRoot = parentMessage.data.parentMessage.connectedTo || parentMessageId;

      const replyData: SendMessageRequest = {
        ...messageData,
        reply_to: parentMessageId,
        thread_root: threadRoot,
      };

      console.log('💬 Sending thread reply:', { channelId, parentMessageId, threadRoot, replyData });

      return this.sendMessage(channelId, replyData);
    } catch (error) {
      console.error('❌ Error sending thread reply:', error);
      throw error;
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<{ success: boolean }> {
    try {
      const token = await tokenManager.getCurrentToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const url = `${this.baseUrl}/channels/${channelId}/messages/${messageId}/reactions`;

      console.log('👍 Adding reaction:', { channelId, messageId, emoji });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to add reaction:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Failed to add reaction: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Reaction added successfully:', data);

      return data;
    } catch (error) {
      console.error('❌ Error adding reaction:', error);
      throw error;
    }
  }
}

export const messageService = new MessageService();