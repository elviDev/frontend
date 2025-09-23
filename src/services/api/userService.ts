import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthError } from './authService';
import { tokenManager } from '../tokenManager';
import { API_BASE_URL } from '../../config/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ceo' | 'manager' | 'staff';
  department?: string;
  job_title?: string;
  phone?: string;
  avatar_url?: string;
  timezone?: string;
  language_preference?: string;
  notification_settings?: Record<string, any>;
  voice_settings?: Record<string, any>;
  email_verified: boolean;
  last_active?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserData {
  name?: string;
  department?: string;
  job_title?: string;
  phone?: string;
  avatar_url?: string;
  timezone?: string;
  language_preference?: string;
  notification_settings?: Record<string, any>;
  voice_settings?: Record<string, any>;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface UserStats {
  userId: string;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  channelStats: {
    memberships: number;
    messagesCount: number;
  };
  activityStats: {
    lastActive?: string;
    totalSessions: number;
    avgSessionDuration: number;
  };
}

class UserService {
  private tokenCache: { token: string | null; timestamp: number } = { token: null, timestamp: 0 };
  private readonly TOKEN_CACHE_DURATION = 30000; // 30 seconds

  private async getAuthToken(): Promise<string | null> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.tokenCache.token && (now - this.tokenCache.timestamp) < this.TOKEN_CACHE_DURATION) {
        return this.tokenCache.token;
      }

      const token = await tokenManager.getCurrentToken();
      
      // Cache the token
      this.tokenCache = { token, timestamp: now };
      
      console.log('🔑 UserService: Token retrieval result:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
        fromCache: false
      });
      
      if (!token) {
        console.warn('🔑 UserService: No token available, user may need to login');
      }
      
      return token;
    } catch (error) {
      console.error('🔑 UserService: Failed to get auth token:', error);
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
      console.log('🔑 UserService: Authorization header set with token');
    } else {
      console.warn('🔑 UserService: Making request WITHOUT authorization header - this will likely fail');
    }



    const baseUrl = API_BASE_URL;
    console.log(`🌐 UserService: Making request to ${baseUrl}/${endpoint}`, {
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

      console.log(`📈 UserService: Response status: ${response.status} for ${endpoint}`);

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('📈 UserService: Failed to parse response JSON:', parseError);
        throw new AuthError(
          'Server returned an invalid response. Please try again.',
          'INVALID_RESPONSE',
          response.status
        );
      }

      if (!response.ok) {
        const errorMessage = data.error?.message || `Request failed with status ${response.status}`;
        const errorCode = data.error?.code || 'REQUEST_FAILED';
        
        console.error(`❌ UserService: API Error ${response.status}:`, {
          errorMessage,
          errorCode,
          endpoint,
          hasToken: !!token,
          tokenLength: token ? token.length : 0
        });

        // Handle 401/403 errors
        if (response.status === 401 || response.status === 403) {
          // Try server token refresh once
          if (retryCount === 0) {
            console.log('🔄 UserService: Got 401/403, attempting server token refresh...');
            try {
              // Clear token cache before refresh
              this.tokenCache = { token: null, timestamp: 0 };
              
              // Actually refresh the token from the server
              const newToken = await tokenManager.refreshAccessToken();
              if (!newToken) {
                throw new Error('Failed to obtain new token');
              }
              
              console.log('🔄 UserService: Server token refresh successful, retrying request...');
              return this.makeRequest(endpoint, options, 1);
            } catch (refreshError) {
              console.error('🔄 UserService: Server token refresh failed:', refreshError);
              throw new AuthError('Session expired. Please log in again.', 'SESSION_EXPIRED', 401);
            }
          }
        }

        throw new AuthError(errorMessage, errorCode, response.status);
      }

      console.log('✅ UserService: Request successful:', endpoint);
      return data;
    } catch (error: any) {
      console.error('❌ UserService: Request failed:', {
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

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    const response = await this.makeRequest<{
      success: boolean;
      data: { user: User };
    }>('/auth/me');
    
    return response.data.user;
  }

  // Get user by ID
  async getUserById(userId: string): Promise<User> {
    const response = await this.makeRequest<ApiResponse<User>>(`/users/${userId}`);
    return response.data;
  }

  // Update user profile
  async updateUser(userId: string, updateData: UpdateUserData): Promise<User> {
    const response = await this.makeRequest<ApiResponse<User>>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return response.data;
  }

  // Update current user profile
  async updateCurrentUser(updateData: UpdateUserData): Promise<User> {
    // Get current user first to get their ID
    const currentUser = await this.getCurrentUser();
    const updatedUser = await this.updateUser(currentUser.id, updateData);
    return updatedUser;
  }

  // Change password
  async changePassword(userId: string, passwordData: ChangePasswordData): Promise<boolean> {
    const response = await this.makeRequest<ApiResponse<{ message: string }>>(`/users/${userId}/change-password`, {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
    return response.success;
  }

  // Change current user password
  async changeCurrentUserPassword(passwordData: ChangePasswordData): Promise<boolean> {
    // Get current user first to get their ID
    const currentUser = await this.getCurrentUser();
    return this.changePassword(currentUser.id, passwordData);
  }

  // Get user stats (for admins/managers)
  async getUserStats(userId: string): Promise<UserStats> {
    const response = await this.makeRequest<ApiResponse<UserStats>>(`/users/${userId}/stats`);
    return response.data;
  }

  // List users (for admins/managers)
  async getUsers(options?: {
    search?: string;
    role?: string;
    department?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    users: User[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const queryParams = new URLSearchParams();
    
    if (options?.search) queryParams.set('search', options.search);
    if (options?.role) queryParams.set('role', options.role);
    if (options?.department) queryParams.set('department', options.department);
    if (options?.status) queryParams.set('status', options.status);
    if (options?.limit) queryParams.set('limit', options.limit.toString());
    if (options?.offset) queryParams.set('offset', options.offset.toString());

    const queryString = queryParams.toString();
    const url = `/users${queryString ? '?' + queryString : ''}`;
    
    const response = await this.makeRequest<{
      success: boolean;
      data: User[];
      pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(url);
    
    return {
      users: response.data,
      pagination: response.pagination,
    };
  }

  // Delete user (admin only)
  async deleteUser(userId: string): Promise<boolean> {
    const response = await this.makeRequest<ApiResponse<{ message: string }>>(`/users/${userId}`, {
      method: 'DELETE',
    });
    return response.success;
  }

  // Upload avatar
  async uploadAvatar(file: File | Blob, userId?: string): Promise<string> {
    // This would typically use a file upload endpoint
    // For now, we'll simulate with a placeholder
    console.log('Avatar upload would be implemented here');
    
    // Return placeholder URL for now
    return 'https://via.placeholder.com/150';
  }

  // Get current user ID
  async getCurrentUserId(): Promise<string | null> {
    try {
      const currentUser = await this.getCurrentUser();
      return currentUser.id;
    } catch (error) {
      console.error('Failed to get current user ID:', error);
      return null;
    }
  }
}

export const userService = new UserService();