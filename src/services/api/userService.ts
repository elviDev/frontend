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
      
      if (!token) {
        console.warn('UserService: No token available, user may need to login');
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
    } else {
      console.warn('UserService: Making request WITHOUT authorization header - this will likely fail');
    }



    const baseUrl = API_BASE_URL;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${baseUrl}/${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);


      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('UserService: Failed to parse response JSON:', parseError);
        throw new AuthError(
          'Server returned an invalid response. Please try again.',
          'INVALID_RESPONSE',
          response.status
        );
      }

      if (!response.ok) {
        const errorMessage = data.error?.message || `Request failed with status ${response.status}`;
        const errorCode = data.error?.code || 'REQUEST_FAILED';
        
        console.error(`UserService: API Error ${response.status}:`, {
          errorMessage,
          errorCode,
          endpoint
        });

        // Handle 401/403 errors
        if (response.status === 401 || response.status === 403) {
          // Try server token refresh once
          if (retryCount === 0) {
            try {
              // Clear token cache before refresh
              this.tokenCache = { token: null, timestamp: 0 };
              
              // Actually refresh the token from the server
              const newToken = await tokenManager.refreshAccessToken();
              if (!newToken) {
                throw new Error('Failed to obtain new token');
              }
              
              return this.makeRequest(endpoint, options, 1);
            } catch (refreshError) {
              console.error('UserService: Server token refresh failed:', refreshError);
              throw new AuthError('Session expired. Please log in again.', 'SESSION_EXPIRED', 401);
            }
          }
        }

        throw new AuthError(errorMessage, errorCode, response.status);
      }

      return data;
    } catch (error: any) {
      console.error('UserService: Request failed:', {
        error: error.message,
        endpoint,
        retryCount
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

  // Step 1: Initiate profile picture upload and get presigned URL
  async initiateProfilePictureUpload(
    userId: string, 
    fileName: string, 
    contentType: string, 
    fileSize?: number
  ): Promise<{ uploadUrl: string; fileId: string; downloadUrl?: string }> {
    
    // Validate file before sending to backend
    this.validateImageFile(fileName, contentType, fileSize);
    
    const response = await this.makeRequest<ApiResponse<{ uploadUrl: string; fileId: string; downloadUrl?: string }>>(
      `/users/${userId}/profile-picture`,
      {
        method: 'POST',
        body: JSON.stringify({
          fileName,
          contentType,
          fileSize: fileSize || 0,
          description: 'Profile Picture'
        }),
      }
    );
    return response.data;
  }

  // Step 3: Complete profile picture upload
  async completeProfilePictureUpload(
    userId: string, 
    fileId: string, 
    success: boolean, 
    error?: string
  ): Promise<User> {
    const response = await this.makeRequest<ApiResponse<User>>(
      `/users/${userId}/profile-picture/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ 
          fileId, 
          success,
          error: error || null
        }),
      }
    );
    return response.data;
  }

  // Delete profile picture
  async deleteProfilePicture(userId: string): Promise<User> {
    const response = await this.makeRequest<ApiResponse<User>>(
      `/users/${userId}/profile-picture`,
      {
        method: 'DELETE',
      }
    );
    return response.data;
  }

  // Upload profile picture using backend's recommended 3-step S3 process
  async uploadProfilePicture(userId: string, imageUri: string, fileName: string, mimeType: string): Promise<User> {
    let uploadData: { uploadUrl: string; fileId: string; downloadUrl?: string } | null = null;
    
    try {
      console.log('🖼️ Starting profile picture upload (3-step S3 process):', { userId, imageUri, fileName, mimeType });
      
      // Step 1: Initiate upload and get presigned URL
      console.log('📤 Step 1: Initiating upload...');
      uploadData = await this.initiateProfilePictureUpload(userId, fileName, mimeType);
      console.log('✅ Upload initiated:', uploadData);
      
      // Step 2: Upload file directly to S3 using presigned URL
      console.log('☁️ Step 2: Uploading to S3...');
      const uploadSuccess = await this.uploadToS3(uploadData.uploadUrl, imageUri, mimeType);
      console.log('✅ S3 upload success:', uploadSuccess);
      
      // Step 3: Complete the upload process with success
      console.log('🏁 Step 3: Completing upload...');
      const result = await this.completeProfilePictureUpload(userId, uploadData.fileId, true);
      console.log('✅ Upload completed successfully:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Profile picture upload error:', error);
      
      // If we got an upload data, complete with failure
      if (uploadData?.fileId) {
        try {
          console.log('🔄 Completing upload with failure status...');
          await this.completeProfilePictureUpload(userId, uploadData.fileId, false, error.message);
        } catch (completeError) {
          console.error('❌ Failed to complete upload with error status:', completeError);
        }
      }
      
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Failed to upload profile picture: ' + error.message, 'UPLOAD_FAILED');
    }
  }

  // Step 2: Upload file directly to S3
  private async uploadToS3(uploadUrl: string, imageUri: string, mimeType: string): Promise<boolean> {
    try {
      console.log('☁️ Uploading to S3 URL:', uploadUrl);
      
      // For React Native, we need to create a proper file object
      const fileObject = {
        uri: imageUri,
        type: mimeType,
        name: 'profile-picture.jpg', // S3 doesn't care about the name
      } as any;
      
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
        body: fileObject, // React Native will handle this properly
      });
      
      console.log('☁️ S3 Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        throw new Error(`S3 upload failed: ${response.statusText}`);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      throw new AuthError(`S3 upload failed: ${error.message}`, 'S3_UPLOAD_FAILED');
    }
  }

  // Helper method to validate file before upload
  private validateImageFile(fileName: string, mimeType: string, fileSize?: number): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(mimeType)) {
      throw new AuthError('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'INVALID_FILE_TYPE');
    }
    
    if (fileSize && fileSize > maxSize) {
      throw new AuthError('File size must be less than 5MB', 'FILE_TOO_LARGE');
    }
    
    return true;
  }

  // Alternative: Simple form-based upload (as suggested by backend)
  async updateProfileWithPicture(
    userId: string, 
    profileData: Partial<User>, 
    imageUri?: string, 
    fileName?: string, 
    mimeType?: string
  ): Promise<User> {
    try {
      console.log('🖼️ Updating profile with picture (form-based):', { userId, profileData, imageUri });
      
      const formData = new FormData();
      
      // Add profile fields
      Object.keys(profileData).forEach(key => {
        const value = profileData[key as keyof User];
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      
      // Add profile picture if provided
      if (imageUri && fileName && mimeType) {
        this.validateImageFile(fileName, mimeType);
        
        const fileObject = {
          uri: imageUri,
          type: mimeType,
          name: fileName,
        } as any;
        
        formData.append('profilePicture', fileObject);
      }
      
      const token = await this.getAuthToken();
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          // Don't set Content-Type for FormData - let browser set it with boundary
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `Update failed with status ${response.status}`;
        throw new AuthError(errorMessage, 'UPDATE_FAILED', response.status);
      }
      
      const data = await response.json();
      return data.data || data;
      
    } catch (error) {
      console.error('❌ Profile update with picture failed:', error);
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Failed to update profile: ' + error.message, 'UPDATE_FAILED');
    }
  }

  // Upload avatar (legacy method for backward compatibility)
  async uploadAvatar(file: File | Blob, userId?: string): Promise<string> {
    console.log('Avatar upload would be implemented here');
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