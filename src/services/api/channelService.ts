import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthError } from './authService';
import { tokenManager } from '../tokenManager';
import { messageService } from './messageService';
import { API_BASE_URL } from '../../config/api';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  channel_type: 'project' | 'department' | 'initiative' | 'temporary' | 'emergency' | 'announcement';
  privacy_level: 'public' | 'private' | 'restricted';
  status: 'active' | 'archived' | 'paused' | 'completed';
  created_by: string;
  owned_by: string;
  moderators: string[];
  members: string[];
  member_count: number;
  max_members: number;
  auto_join_roles: string[];
  settings: Record<string, any>;
  integrations: Record<string, any>;
  activity_stats: Record<string, any>;
  project_info: Record<string, any>;
  schedule: Record<string, any>;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
  retention_until?: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  task_id?: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'voice' | 'file' | 'system' | 'command_result' | 'ai_response';
  voice_data?: any;
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
  ai_context?: any;
  command_execution_id?: string;
  metadata: Record<string, any>;
  formatting: Record<string, any>;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  user_name?: string;
  user_avatar?: string;
}

export interface CreateChannelData {
  name: string;
  description?: string;
  type: Channel['channel_type'];
  privacy: Channel['privacy_level'];
  parent_id?: string;
  settings?: Record<string, any>;
  tags?: string[];
  color?: string;
}

export interface UpdateChannelData {
  name?: string;
  description?: string;
  type?: Channel['channel_type'];
  privacy?: Channel['privacy_level'];
  settings?: Record<string, any>;
  tags?: string[];
  color?: string;
}

export interface SendMessageData {
  content: string;
  message_type?: 'text' | 'voice' | 'file';
  reply_to?: string;
  mentions?: string[];
  attachments?: any[];
}

export interface ChannelMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
}

export interface ChannelCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class ChannelService {
  private async getAuthToken(): Promise<string | null> {
    try {
      // Use centralized token manager
      const token = await tokenManager.getCurrentToken();
      console.log('🔑 ChannelService: Token retrieval result:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'none'
      });
      
      // Additional validation
      if (!token) {
        console.warn('🔑 ChannelService: No token available, user may need to login');
        const tokenInfo = await tokenManager.getTokenInfo();
        console.log('🔑 ChannelService: Token info:', tokenInfo);
      }
      
      return token;
    } catch (error) {
      console.error('🔑 ChannelService: Failed to get auth token:', error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const token = await this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log('🔑 ChannelService: Authorization header set with token');
    } else {
      console.warn('🔑 ChannelService: Making request WITHOUT authorization header - this will likely fail');
    }



    const baseUrl = API_BASE_URL;
    console.log(`🌐 ChannelService: Making request to ${baseUrl}/${endpoint}`, {
      method: options.method || 'GET',
      hasAuthHeader: !!headers.Authorization,
      endpoint
    });
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${baseUrl}/${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📈 ChannelService: Response status: ${response.status} for ${endpoint}`);

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('📈 ChannelService: Failed to parse response JSON:', parseError);
        throw new AuthError(
          'Server returned an invalid response. Please try again.',
          'INVALID_RESPONSE',
          response.status
        );
      }

      if (!response.ok) {
        const errorMessage = data.error?.message || `Request failed with status ${response.status}`;
        const errorCode = data.error?.code || 'REQUEST_FAILED';
        
        console.error(`❌ ChannelService: API Error ${response.status}:`, {
          errorMessage,
          errorCode,
          endpoint,
          hasToken: !!token,
          tokenLength: token ? token.length : 0
        });

        // Handle 401/403 errors
        if (response.status === 401 || response.status === 403) {
          // For 403 on member endpoints, this might be a permission issue, not auth issue
          if (response.status === 403 && endpoint.includes('/members')) {
            console.log(`🔒 ChannelService: Access denied to ${endpoint} (insufficient permissions)`);
            throw new AuthError('Insufficient permissions to access this resource', 'ACCESS_DENIED', 403);
          }
          
          // For other 401/403, try token refresh once
          if (retryCount === 0) {
            console.log('🔄 ChannelService: Got 401/403, attempting token refresh...');
            try {
              await tokenManager.refreshFromStorage();
              console.log('🔄 ChannelService: Token refresh attempted, retrying request...');
              return this.makeRequest(endpoint, options, 1); // Retry once with retryCount = 1
            } catch (refreshError) {
              console.error('🔄 ChannelService: Token refresh failed:', refreshError);
              throw new AuthError('Session expired. Please log in again.', 'SESSION_EXPIRED', 401);
            }
          }
        }

        throw new AuthError(errorMessage, errorCode, response.status);
      }

      console.log('✅ ChannelService: Request successful:', endpoint);
      return data;
    } catch (error: any) {
      console.error('❌ ChannelService: Request failed:', {
        error: error.message,
        endpoint,
        retryCount,
        hasToken: !!token
      });
      
      if (error.name === 'AbortError') {
        throw new AuthError(
          'Request timed out. Please check your connection and try again.',
          'TIMEOUT',
          408
        );
      }

      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        'Something went wrong. Please try again.',
        'NETWORK_ERROR',
        0
      );
    }
  }

  // Channel Management
  async getChannels(): Promise<Channel[]> {
    const response = await this.makeRequest<PaginatedResponse<Channel>>('/channels');
    return response.data;
  }

  async getChannelCategories(): Promise<ChannelCategory[]> {
    const response = await this.makeRequest<ApiResponse<ChannelCategory[]>>('/channels/categories');
    return response.data;
  }

  async getChannel(channelId: string): Promise<Channel> {
    const response = await this.makeRequest<ApiResponse<Channel>>(`/channels/${channelId}`);
    return response.data;
  }

  async createChannel(channelData: CreateChannelData): Promise<Channel> {
    const response = await this.makeRequest<ApiResponse<Channel>>('/channels', {
      method: 'POST',
      body: JSON.stringify(channelData),
    });
    return response.data;
  }

  async updateChannel(channelId: string, updateData: UpdateChannelData): Promise<Channel> {
    const response = await this.makeRequest<ApiResponse<Channel>>(`/channels/${channelId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return response.data;
  }

  async deleteChannel(channelId: string): Promise<boolean> {
    const response = await this.makeRequest<ApiResponse<{ message: string }>>(`/channels/${channelId}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  // Channel Members
  async getChannelMembers(
    channelId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<PaginatedResponse<ChannelMember>> {
    const queryParams = new URLSearchParams();
    if (options?.limit) queryParams.set('limit', options.limit.toString());
    if (options?.offset) queryParams.set('offset', options.offset.toString());

    const queryString = queryParams.toString();
    const url = `/channels/${channelId}/members${queryString ? '?' + queryString : ''}`;
    
    const response = await this.makeRequest<PaginatedResponse<ChannelMember>>(url);
    return response; // Return full response instead of just data
  }

  async addChannelMember(channelId: string, userId: string, role: ChannelMember['role'] = 'member'): Promise<boolean> {
    const response = await this.makeRequest<ApiResponse<{ message: string }>>(`/channels/${channelId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
    return response.success;
  }

  async removeChannelMember(channelId: string, userId: string): Promise<boolean> {
    const response = await this.makeRequest<ApiResponse<{ message: string }>>(`/channels/${channelId}/members/${userId}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  // Messages
  async getChannelMessages(
    channelId: string, 
    limit: number = 50, 
    offset: number = 0,
    options?: {
      threadRoot?: string;
      search?: string;
      messageType?: string;
      before?: string;
      after?: string;
    }
  ): Promise<PaginatedResponse<Message>> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (options?.threadRoot) queryParams.set('thread_root', options.threadRoot);
    if (options?.search) queryParams.set('search', options.search);
    if (options?.messageType) queryParams.set('message_type', options.messageType);
    if (options?.before) queryParams.set('before', options.before);
    if (options?.after) queryParams.set('after', options.after);

    const response = await this.makeRequest<PaginatedResponse<Message>>(`/channels/${channelId}/messages?${queryParams}`);
    return response; // Return full response instead of just data
  }

  async sendMessage(channelId: string, messageData: SendMessageData): Promise<Message> {
    const response = await this.makeRequest<ApiResponse<Message>>(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
    return response.data;
  }

  async editMessage(channelId: string, messageId: string, content: string): Promise<Message> {
    const response = await this.makeRequest<ApiResponse<Message>>(`/channels/${channelId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    return response.data;
  }

  async deleteMessage(channelId: string, messageId: string): Promise<boolean> {
    const response = await this.makeRequest<ApiResponse<{ message: string }>>(`/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  async addMessageReaction(channelId: string, messageId: string, emoji: string): Promise<boolean> {
    const response = await this.makeRequest<ApiResponse<{ message: string }>>(`/channels/${channelId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
    return response.success;
  }

  async pinMessage(channelId: string, messageId: string, pinned: boolean = true): Promise<boolean> {
    const response = await this.makeRequest<ApiResponse<{ message: string }>>(`/channels/${channelId}/messages/${messageId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ pinned }),
    });
    return response.success;
  }

  async searchMessages(channelId: string, query: string, limit: number = 50): Promise<Message[]> {
    const response = await this.makeRequest<PaginatedResponse<Message>>(`/channels/${channelId}/messages?search=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }

  // Search and Filtering
  async searchChannels(query: string, limit: number = 20): Promise<Channel[]> {
    const response = await this.makeRequest<PaginatedResponse<Channel>>(`/channels?search=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }

  async getChannelsByType(type: Channel['channel_type']): Promise<Channel[]> {
    const response = await this.makeRequest<PaginatedResponse<Channel>>(`/channels?type=${type}`);
    return response.data;
  }

  async getUserChannels(): Promise<Channel[]> {
    return this.getChannels(); // The backend already filters by user access
  }

  /**
   * Get channel statistics (message count, file count, members)
   */
  async getChannelStats(channelId: string): Promise<{
    messageCount: number;
    fileCount: number;
    memberCount: number;
  }> {
    try {
      console.log('🔍 Fetching channel stats for:', channelId);
      
      // Use messageService for messages since it has the correct API structure
      
      const [messagesResponse, filesResponse, membersResponse] = await Promise.allSettled([
        messageService.getChannelMessages(channelId, { limit: 1, offset: 0 }),
        this.getChannelFiles(channelId, { limit: 1, offset: 0 }),
        this.getChannelMembers(channelId, { limit: 1, offset: 0 })
      ]);

      // Enhanced logging for debugging
      console.log('📈 Stats responses:', {
        messages: messagesResponse.status === 'fulfilled' ? 'success' : messagesResponse.reason,
        files: filesResponse.status === 'fulfilled' ? 'success' : filesResponse.reason,
        members: membersResponse.status === 'fulfilled' ? 'success' : membersResponse.reason,
      });

      if (messagesResponse.status === 'fulfilled') {
        console.log('📥 Message response structure:', {
          hasData: !!messagesResponse.value?.data,
          hasPagination: !!messagesResponse.value?.data?.pagination,
          total: messagesResponse.value?.data?.pagination?.total,
          structure: Object.keys(messagesResponse.value || {}),
        });
      }

      if (filesResponse.status === 'fulfilled') {
        console.log('📁 Files response structure:', {
          hasPagination: !!filesResponse.value?.pagination,
          total: filesResponse.value?.pagination?.total,
          structure: Object.keys(filesResponse.value || {}),
        });
      }

      if (membersResponse.status === 'fulfilled') {
        console.log('👥 Members response structure:', {
          hasPagination: !!membersResponse.value?.pagination,
          total: membersResponse.value?.pagination?.total,
          structure: Object.keys(membersResponse.value || {}),
        });
      }

      const messageCount = messagesResponse.status === 'fulfilled' 
        ? messagesResponse.value?.data?.pagination?.total || 0
        : 0;
        
      const fileCount = filesResponse.status === 'fulfilled' 
        ? filesResponse.value?.pagination?.total || 0
        : 0;
        
      const memberCount = membersResponse.status === 'fulfilled' 
        ? membersResponse.value?.pagination?.total || 0
        : 0;

      const stats = {
        messageCount,
        fileCount,
        memberCount,
      };

      console.log('📊 Final channel stats:', stats);
      
      return stats;
    } catch (error) {
      console.error('❌ Failed to fetch channel stats:', error);
      // Return actual zeros instead of mock data for accurate display
      return {
        messageCount: 0,
        fileCount: 0,
        memberCount: 0,
      };
    }
  }

  /**
   * Get channels with their statistics
   */
  async getChannelsWithStats(): Promise<(Channel & {
    messageCount: number;
    fileCount: number;
  })[]> {
    try {
      const channels = await this.getChannels();
      
      // Fetch stats for all channels in parallel
      const channelsWithStats = await Promise.all(
        channels.map(async (channel) => {
          const stats = await this.getChannelStats(channel.id);
          return {
            ...channel,
            messageCount: stats.messageCount,
            fileCount: stats.fileCount,
          };
        })
      );

      return channelsWithStats;
    } catch (error) {
      console.error('Failed to fetch channels with stats:', error);
      // Return channels without stats as fallback
      const channels = await this.getChannels();
      return channels.map(channel => ({
        ...channel,
        messageCount: 0,
        fileCount: 0,
      }));
    }
  }

  // Channel Actions
  async joinChannel(channelId: string): Promise<boolean> {
    try {
      // Add current user as member
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) {
        throw new AuthError('User not authenticated', 'UNAUTHORIZED', 401);
      }
      
      return await this.addChannelMember(channelId, currentUserId, 'member');
    } catch (error) {
      console.error('Failed to join channel:', error);
      throw error;
    }
  }

  async leaveChannel(channelId: string): Promise<boolean> {
    try {
      const currentUserId = await this.getCurrentUserId();
      if (!currentUserId) {
        throw new AuthError('User not authenticated', 'UNAUTHORIZED', 401);
      }
      
      return await this.removeChannelMember(channelId, currentUserId);
    } catch (error) {
      console.error('Failed to leave channel:', error);
      throw error;
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      // This would typically come from your auth service or stored user info
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        return user.id || user.userId;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user ID:', error);
      return null;
    }
  }

  // Archive/Restore
  async archiveChannel(channelId: string, reason?: string): Promise<boolean> {
    // This would be implemented as a status update
    const response = await this.updateChannel(channelId, { 
      // Archive functionality would need to be added to the update endpoint
    });
    return !!response;
  }

  async restoreChannel(channelId: string): Promise<boolean> {
    // This would be implemented as a status update
    const response = await this.updateChannel(channelId, {
      // Restore functionality would need to be added to the update endpoint
    });
    return !!response;
  }

  // Channel Tasks
  async getChannelTasks(
    channelId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string[];
      priority?: string[];
      assigned_to?: string;
    }
  ): Promise<any[]> {
    const queryParams = new URLSearchParams();
    
    if (options?.limit) queryParams.set('limit', options.limit.toString());
    if (options?.offset) queryParams.set('offset', options.offset.toString());
    if (options?.status) options.status.forEach(s => queryParams.append('status', s));
    if (options?.priority) options.priority.forEach(p => queryParams.append('priority', p));
    if (options?.assigned_to) queryParams.set('assigned_to', options.assigned_to);

    const response = await this.makeRequest<PaginatedResponse<any>>(`/channels/${channelId}/tasks?${queryParams}`);
    return response.data;
  }

  async createChannelTask(channelId: string, taskData: any): Promise<any> {
    const response = await this.makeRequest<ApiResponse<any>>(`/channels/${channelId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    return response.data;
  }

  async getChannelTaskStats(channelId: string): Promise<any> {
    const response = await this.makeRequest<ApiResponse<any>>(`/channels/${channelId}/tasks/stats`);
    return response.data;
  }

  async linkTaskToChannel(taskId: string, channelId: string | null): Promise<any> {
    const response = await this.makeRequest<ApiResponse<any>>(`/tasks/${taskId}/channel`, {
      method: 'PUT',
      body: JSON.stringify({ channel_id: channelId }),
    });
    return response.data;
  }

  // Channel Files
  async getChannelFiles(
    channelId: string,
    options?: {
      limit?: number;
      offset?: number;
      file_type?: string;
      uploaded_by?: string;
      search?: string;
    }
  ): Promise<PaginatedResponse<any>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options?.limit) queryParams.set('limit', options.limit.toString());
      if (options?.offset) queryParams.set('offset', options.offset.toString());
      if (options?.file_type) queryParams.set('file_type', options.file_type);
      if (options?.uploaded_by) queryParams.set('uploaded_by', options.uploaded_by);
      if (options?.search) queryParams.set('search', options.search);

      const response = await this.makeRequest<PaginatedResponse<any>>(`/channels/${channelId}/files?${queryParams}`);
      return response; // Return full response instead of just data
    } catch (error: any) {
      console.warn(`📁 ChannelService: Failed to load files for channel ${channelId}, returning empty list:`, error.message);
      
      // Return empty paginated response instead of throwing error
      return {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
        pagination: {
          total: 0,
          limit: options?.limit || 20,
          offset: options?.offset || 0,
          hasMore: false
        }
      };
    }
  }

  // Channel Activity
  async getChannelActivity(
    channelId: string,
    options?: {
      limit?: number;
      offset?: number;
      activity_type?: string;
      user_id?: string;
      after?: string;
    }
  ): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options?.limit) queryParams.set('limit', options.limit.toString());
      if (options?.offset) queryParams.set('offset', options.offset.toString());
      if (options?.activity_type) queryParams.set('activity_type', options.activity_type);
      if (options?.user_id) queryParams.set('user_id', options.user_id);
      if (options?.after) queryParams.set('after', options.after);

      const response = await this.makeRequest<PaginatedResponse<any>>(`/channels/${channelId}/activity?${queryParams}`);
      return response.data;
    } catch (error: any) {
      console.warn(`📊 ChannelService: Failed to load activity for channel ${channelId}, returning empty list:`, error.message);
      return [];
    }
  }

  async logChannelActivity(
    channelId: string,
    activityData: {
      activity_type: string;
      title: string;
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    const response = await this.makeRequest<ApiResponse<any>>(`/channels/${channelId}/activity`, {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
    return response.data;
  }

  // Utility Methods
  async getChannelStatistics(channelId: string): Promise<{
    memberCount: number;
    messageCount: number;
    taskCount: number;
    fileCount: number;
    activityCount: number;
  }> {
    // This would aggregate data from multiple endpoints
    try {
      const [channel, tasks, files, activity] = await Promise.allSettled([
        this.getChannel(channelId),
        this.getChannelTasks(channelId, { limit: 1 }),
        this.getChannelFiles(channelId, { limit: 1 }),
        this.getChannelActivity(channelId, { limit: 1 }),
      ]);

      return {
        memberCount: channel.status === 'fulfilled' ? channel.value.member_count : 0,
        messageCount: 0, // Would need to get from messages endpoint
        taskCount: 0, // Would need to get total count from tasks endpoint
        fileCount: 0, // Would need to get total count from files endpoint
        activityCount: 0, // Would need to get total count from activity endpoint
      };
    } catch (error) {
      console.error('Failed to get channel statistics:', error);
      return {
        memberCount: 0,
        messageCount: 0,
        taskCount: 0,
        fileCount: 0,
        activityCount: 0,
      };
    }
  }
}

export const channelService = new ChannelService();