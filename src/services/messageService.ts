import { API_BASE_URL } from '../config/api';
import { tokenManager } from './tokenManager';
import type {
  ApiResponse,
  ApiError,
} from '../types/api';
import type { Message } from '../types/message';

class MessageService {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second base delay
  
  // Cache and request deduplication
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly defaultCacheTTL = 300000; // 5 minutes
  
  // Token caching for consistent auth
  private tokenCache: { token: string | null; timestamp: number } = { token: null, timestamp: 0 };
  private readonly TOKEN_CACHE_DURATION = 30000; // 30 seconds

  private async getAuthToken(): Promise<string | null> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.tokenCache.token && (now - this.tokenCache.timestamp) < this.TOKEN_CACHE_DURATION) {
        return this.tokenCache.token;
      }

      // Use centralized token manager
      const token = await tokenManager.getCurrentToken();
      
      // Cache the token
      this.tokenCache = { token, timestamp: now };
      
      if (!token) {
        console.warn('MessageService: No token available, user may need to login');
      }
      
      return token;
    } catch (error) {
      console.error('MessageService: Failed to get auth token:', error);
      return null;
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleAuthError(error: any): void {
    // Clear token cache on authentication errors
    if (error.error?.statusCode === 401 || error.error?.statusCode === 403) {
      this.tokenCache = { token: null, timestamp: 0 };
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = this.maxRetries
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        // Handle auth errors
        this.handleAuthError(error);
        
        const isLastAttempt = attempt === retries;
        const isRetryableError = this.isRetryableError(error);
        
        if (isLastAttempt || !isRetryableError) {
          console.error(`${operationName} failed after ${attempt + 1} attempts:`, error);
          throw error;
        }
        
        const delayMs = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`${operationName} attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`, error.message);
        await this.delay(delayMs);
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error(`${operationName} failed after all retries`);
  }

  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
      return true;
    }
    
    // Timeout errors
    if (error.message?.includes('timeout')) {
      return true;
    }
    
    // 5xx server errors
    if (error.error?.statusCode >= 500) {
      return true;
    }
    
    // Rate limiting (429)
    if (error.error?.statusCode === 429) {
      return true;
    }
    
    // Connection errors
    if (error.message?.includes('fetch') || error.message?.includes('connection')) {
      return true;
    }
    
    return false;
  }

  // Cache management methods
  private getCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return `${prefix}-${JSON.stringify(sortedParams)}`;
  }

  private isValidCache(cached: { timestamp: number; ttl: number }): boolean {
    return (Date.now() - cached.timestamp) < cached.ttl;
  }

  private async getCachedOrFetch<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultCacheTTL
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached)) {
      return cached.data;
    }

    // Check for pending request (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create new request
    const request = fetcher().finally(() => {
      this.pendingRequests.delete(cacheKey);
    });

    this.pendingRequests.set(cacheKey, request);

    try {
      const data = await request;
      // Cache successful responses
      this.cache.set(cacheKey, { 
        data, 
        timestamp: Date.now(), 
        ttl 
      });
      return data;
    } catch (error) {
      // Don't cache errors
      this.cache.delete(cacheKey);
      throw error;
    }
  }

  // Cache invalidation for write operations
  private invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let data;
    
    try {
      data = await response.json();
    } catch (parseError) {
      // Handle empty responses or non-JSON responses
      if (response.status === 204 || response.status === 404) {
        // No content or not found - return empty success response
        return {
          success: true,
          data: (response.status === 404 ? [] : null) as T,
          timestamp: new Date().toISOString(),
        };
      }
      throw new Error('Invalid response format');
    }
    
    if (!response.ok) {
      // Handle 404 as empty result rather than error for message endpoints
      if (response.status === 404 && data?.error?.message?.toLowerCase().includes('not found')) {
        return {
          success: true,
          data: [] as T,
          timestamp: new Date().toISOString(),
        };
      }
      throw data as ApiError;
    }
    
    return data;
  }

  // Message Management
  async getChannelMessages(
    channelId: string,
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      message_type?: string;
      before?: string;
      after?: string;
    } = {}
  ): Promise<ApiResponse<Message[]>> {
    const cacheKey = this.getCacheKey('channelMessages', { channelId, ...options });
    
    // Use shorter cache for paginated results (don't cache forever)
    const ttl = options.offset && options.offset > 0 ? 60000 : this.defaultCacheTTL; // 1 min for pagination
    
    return this.getCachedOrFetch(cacheKey, async () => {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const url = `${API_BASE_URL}/channels/${channelId}/messages?${params}`;
      
      const headers = await this.getAuthHeaders();

      return this.retryOperation(async () => {
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        const result = await this.handleResponse<Message[]>(response);
        return result;
      }, 'getChannelMessages');
    }, ttl);
  }

  async sendMessage(
    channelId: string,
    messageData: {
      content: string;
      message_type?: 'text' | 'voice' | 'file' | 'system';
      reply_to_id?: string;
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
      metadata?: Record<string, any>;
    }
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(messageData),
    });

    const result = await this.handleResponse<any>(response);
    
    // Invalidate channel message caches after successful send
    if (result.success) {
      this.invalidateCache(`channelMessages-{"channelId":"${channelId}"`);
    }
    
    return result;
  }

  async editMessage(
    channelId: string,
    messageId: string,
    content: string
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages/${messageId}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ content }),
    });

    const result = await this.handleResponse<any>(response);
    
    // Invalidate all message-related caches after successful edit
    if (result.success) {
      this.invalidateCache('channelMessages');
    }
    
    return result;
  }

  async deleteMessage(channelId: string, messageId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    const result = await this.handleResponse<any>(response);
    
    // Invalidate all message-related caches after successful delete
    if (result.success) {
      this.invalidateCache('channelMessages');
    }
    
    return result;
  }


  // Reaction Management
  async toggleReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<ApiResponse<{
    action: 'added' | 'removed';
    message_id: string;
    emoji: string;
    current_reactions: Array<{
      emoji: string;
      count: number;
      users: Array<{
        id: string;
        name: string;
        avatar_url?: string;
      }>;
    }>;
  }>> {
    const url = `${API_BASE_URL}/channels/${channelId}/messages/${messageId}/reactions`;
    const requestBody = { emoji };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    return this.handleResponse<any>(response);
  }

  async getMessageReactions(channelId: string, messageId: string): Promise<ApiResponse<{
    message_id: string;
    reactions: Array<{
      emoji: string;
      count: number;
      users: Array<{
        id: string;
        name: string;
        avatar_url?: string;
      }>;
    }>;
    total_reactions: number;
    user_reactions: string[];
  }>> {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages/${messageId}/reactions`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<any>(response);
  }

  async removeAllReactions(channelId: string, messageId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages/${messageId}/reactions`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<any>(response);
  }

  async removeSpecificReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      {
        method: 'DELETE',
        headers: await this.getAuthHeaders(),
      }
    );

    const result = await this.handleResponse<any>(response);
    
    // Invalidate reaction caches after successful removal
    if (result.success) {
      this.invalidateCache(`messageReactions-${messageId}`);
      this.invalidateCache(`channelMessages-{"channelId":"${channelId}"`);
    }
    
    return result;
  }

  async pinMessage(
    channelId: string,
    messageId: string
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/channels/${channelId}/messages/${messageId}/pin`,
      {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({}),
      }
    );

    const result = await this.handleResponse<any>(response);
    
    // Invalidate message caches after successful pin
    if (result.success) {
      this.invalidateCache(`channelMessages-{"channelId":"${channelId}"`);
    }
    
    return result;
  }

  async unpinMessage(
    channelId: string,
    messageId: string
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/channels/${channelId}/messages/${messageId}/pin`,
      {
        method: 'DELETE',
        headers: await this.getAuthHeaders(),
      }
    );

    const result = await this.handleResponse<any>(response);
    
    // Invalidate message caches after successful unpin
    if (result.success) {
      this.invalidateCache(`channelMessages-{"channelId":"${channelId}"`);
    }
    
    return result;
  }

  async getMessageReplies(
    channelId: string,
    messageId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ApiResponse<{ replies: Message[]; pagination: any }>> {
    const cacheKey = this.getCacheKey('messageReplies', { channelId, messageId, ...options });
    
    return this.getCachedOrFetch(cacheKey, async () => {
      const params = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(
        `${API_BASE_URL}/channels/${channelId}/messages/${messageId}/replies?${params}`,
        {
          method: 'GET',
          headers: await this.getAuthHeaders(),
        }
      );

      return this.handleResponse<{ replies: Message[]; pagination: any }>(response);
    });
  }

  async addMessageReply(
    channelId: string,
    messageId: string,
    replyData: {
      content: string;
      message_type?: 'text' | 'voice' | 'file';
      attachments?: Array<{
        file_id: string;
        filename: string;
        file_type: string;
        file_size: number;
      }>;
      mentions?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/channels/${channelId}/messages/${messageId}/replies`,
      {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(replyData),
      }
    );

    const result = await this.handleResponse<any>(response);
    
    // Invalidate caches after successful reply
    if (result.success) {
      this.invalidateCache(`messageReplies-{"channelId":"${channelId}","messageId":"${messageId}"`);
      this.invalidateCache(`channelMessages-{"channelId":"${channelId}"`);
    }
    
    return result;
  }

  async editMessageReply(
    channelId: string,
    messageId: string,
    replyId: string,
    content: string
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/channels/${channelId}/messages/${messageId}/replies/${replyId}`,
      {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ content }),
      }
    );

    const result = await this.handleResponse<any>(response);
    
    // Invalidate caches after successful edit
    if (result.success) {
      this.invalidateCache(`messageReplies-{"channelId":"${channelId}","messageId":"${messageId}"`);
      this.invalidateCache(`channelMessages-{"channelId":"${channelId}"`);
    }
    
    return result;
  }

  async deleteMessageReply(
    channelId: string,
    messageId: string,
    replyId: string
  ): Promise<ApiResponse<any>> {
    const response = await fetch(
      `${API_BASE_URL}/channels/${channelId}/messages/${messageId}/replies/${replyId}`,
      {
        method: 'DELETE',
        headers: await this.getAuthHeaders(),
      }
    );

    const result = await this.handleResponse<any>(response);
    
    // Invalidate caches after successful delete
    if (result.success) {
      this.invalidateCache(`messageReplies-{"channelId":"${channelId}","messageId":"${messageId}"`);
      this.invalidateCache(`channelMessages-{"channelId":"${channelId}"`);
    }
    
    return result;
  }

  // Channel Reactions
  async getPopularReactions(
    channelId: string,
    limit: number = 10
  ): Promise<ApiResponse<{
    channel_id: string;
    popular_reactions: Array<{
      emoji: string;
      count: number;
      usage_percentage: number;
    }>;
  }>> {
    const response = await fetch(
      `${API_BASE_URL}/channels/${channelId}/reactions/popular?limit=${limit}`,
      {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      }
    );

    return this.handleResponse<any>(response);
  }

  async getChannelReactionStats(channelId: string): Promise<ApiResponse<{
    channel_id: string;
    total_reactions: number;
    unique_emojis: number;
    most_used_emoji?: string;
    top_reactors: Array<{
      user_id: string;
      user_name: string;
      reaction_count: number;
    }>;
  }>> {
    const response = await fetch(`${API_BASE_URL}/channels/${channelId}/reactions/stats`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<any>(response);
  }

  async getReactionActivity(
    channelId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ApiResponse<{
    channel_id: string;
    activities: Array<{
      reaction: {
        id: string;
        message_id: string;
        user_id: string;
        emoji: string;
        created_at: string;
        user_details: {
          id: string;
          name: string;
          email: string;
          avatar_url?: string;
          role: string;
        };
      };
      message: {
        id: string;
        content: string;
        channel_id: string;
      };
    }>;
    pagination: {
      limit: number;
      offset: number;
      has_more: boolean;
    };
  }>> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(
      `${API_BASE_URL}/channels/${channelId}/reactions/activity?${params}`,
      {
        method: 'GET',
        headers: await this.getAuthHeaders(),
      }
    );

    return this.handleResponse<any>(response);
  }
}

export const messageService = new MessageService();
export default messageService;