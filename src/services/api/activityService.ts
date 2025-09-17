import { authService } from './authService';
import { tokenManager } from '../tokenManager';
import { ApiResponse } from '../../types/api';
import { API_BASE_URL } from '../../config/api';

export interface Activity {
  id: string;
  user_id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'channel_created' | 'user_joined' | 'file_uploaded' | 'message_sent' | 'announcement';
  title: string;
  description: string;
  metadata: any;
  related_id?: string;
  channel_id?: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface ActivityListResponse {
  success: boolean;
  data: Activity[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: string;
}

export interface ActivityFilter {
  type?: string[];
  channel_id?: string;
  user_id?: string;
  limit?: number;
  offset?: number;
  from_date?: string;
  to_date?: string;
}

/**
 * Activity API Service
 * Handles all activity-related API operations with authentication
 */
class ActivityService {
  private readonly baseUrl: string;

  constructor() {


    this.baseUrl = API_BASE_URL;
  }


  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    console.log('🔄 ActivityService makeRequest called:', {
      endpoint,
      baseUrl: this.baseUrl
    });

    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      // Get the access token from authService
      const accessToken = await tokenManager.getCurrentToken();
      
      const config: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
          ...options.headers,
        },
      };

      console.log('🔄 ActivityService request:', {
        endpoint,
        url,
        hasToken: !!accessToken,
        method: config.method || 'GET'
      });

      const response = await fetch(url, config);
      
      console.log('🔄 ActivityService response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorData: any = {};
        let rawErrorText = '';
        try {
          rawErrorText = await response.text();
          console.log('🚨 Raw error response:', rawErrorText);
          errorData = JSON.parse(rawErrorText);
          console.log('🚨 Parsed error data:', errorData);
        } catch (parseError) {
          console.log('🚨 Could not parse error response as JSON:', parseError);
          console.log('🚨 Raw response text:', rawErrorText);
        }
        
        // Create detailed error message
        const errorMessage = errorData.message || 
          errorData.error?.message || 
          `HTTP ${response.status}: ${response.statusText}`;
          
        console.log('🚨 Creating error with message:', errorMessage);
        const error = new Error(errorMessage);
        throw error;
      }
      
      const data = await response.json();
      console.log('✅ ActivityService successful response:', data);
      return data;
    } catch (error) {
      console.error('🚨 ActivityService request failed:', error);
      console.error('🚨 Error type:', typeof error);
      console.error('🚨 Error instanceof Error:', error instanceof Error);
      if (typeof error === 'object' && error !== null && 'name' in error) {
        console.error('🚨 Error name:', (error as { name?: string }).name);
      } else {
        console.error('🚨 Error name: unknown');
      }
      if (error instanceof Error) {
        console.error('🚨 Error message:', error.message);
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        console.error('🚨 Error message:', (error as any).message);
      } else {
        console.error('🚨 Error message: unknown');
      }
      
      // Check if it's a network error (common on mobile)
      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as any).message === 'string' &&
        (
          (error as any).message.includes('Failed to fetch') ||
          (error as any).message.includes('Network request failed') ||
          (error as any).message.includes('fetch')
        )
      ) {
        console.error('🚨 Network error detected - backend may be unreachable');
        throw new Error('Network error: Unable to connect to backend server. Please check your connection.');
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error(`Unknown error occurred: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔄 Testing backend connectivity to:', this.baseUrl);
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('✅ Backend connectivity test response:', response.status, response.statusText);
      return response.status < 500; // Accept any non-server error response
    } catch (error) {
      console.error('🚨 Backend connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Get activities with filters and pagination
   */
  async getActivities(filters?: ActivityFilter): Promise<ActivityListResponse> {
    // First test basic connectivity
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error(`Backend server not accessible at ${this.baseUrl}. Please ensure the backend is running.`);
    }
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const queryString = params.toString();
    const endpoint = `/activities${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<ActivityListResponse>(endpoint);
  }

  /**
   * Get user's activities
   */
  async getUserActivities(userId?: string, limit: number = 50): Promise<ActivityListResponse> {
    const filters: ActivityFilter = {
      limit,
    };

    if (userId) {
      filters.user_id = userId;
    }

    return this.getActivities(filters);
  }

  /**
   * Get channel activities
   */
  async getChannelActivities(channelId: string, limit: number = 50): Promise<ActivityListResponse> {
    return this.getActivities({
      channel_id: channelId,
      limit,
    });
  }

  /**
   * Get activities by type
   */
  async getActivitiesByType(
    types: string[], 
    limit: number = 50
  ): Promise<ActivityListResponse> {
    return this.getActivities({
      type: types,
      limit,
    });
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(limit: number = 20): Promise<ActivityListResponse> {
    return this.getActivities({
      limit,
    });
  }

  /**
   * Create activity (usually called from backend on events)
   */
  async createActivity(activityData: {
    type: string;
    title: string;
    description: string;
    metadata?: any;
    related_id?: string;
    channel_id?: string;
  }): Promise<ApiResponse<Activity>> {
    return this.makeRequest<ApiResponse<Activity>>('/activities', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  }
}

export const activityService = new ActivityService();