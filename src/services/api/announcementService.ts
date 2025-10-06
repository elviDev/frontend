import { tokenManager } from '../tokenManager';
import { API_BASE_URL } from '../../config/api';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'feature' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_audience: 'all' | 'admins' | 'developers' | 'designers' | 'managers';
  scheduled_for?: string;
  expires_at?: string;
  action_button_text?: string;
  action_button_url?: string;
  image_url?: string;
  created_by: string;
  published: boolean;
  read_by: string[];
  created_at: string;
  updated_at: string;
  version: number;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  type: Announcement['type'];
  priority: Announcement['priority'];
  target_audience: Announcement['target_audience'];
  scheduled_for?: Date;
  expires_at?: Date;
  action_button_text?: string;
  action_button_url?: string;
  image_url?: string;
  published?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  limit: number;
  offset: number;
}

class AnnouncementService {
  private async getAuthToken(): Promise<string | null> {
    try {
      return await tokenManager.getCurrentToken();
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  // Create announcement (CEO only)
  async createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
    const response = await this.makeRequest<ApiResponse<Announcement>>('/announcements', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        scheduled_for: data.scheduled_for?.toISOString(),
        expires_at: data.expires_at?.toISOString(),
      }),
    });
    return response.data;
  }

  // Get announcements for current user
  async getUserAnnouncements(): Promise<Announcement[]> {
    const response = await this.makeRequest<PaginatedResponse<Announcement>>(
      '/announcements?user_view=true'
    );
    return response.data;
  }

  // Get all announcements (CEO only)
  async getAllAnnouncements(filters?: {
    type?: string;
    priority?: string;
    published?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Announcement>> {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.published !== undefined) params.set('published', String(filters.published));
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));

    const queryString = params.toString();
    const url = `/announcements${queryString ? '?' + queryString : ''}`;
    
    return this.makeRequest<PaginatedResponse<Announcement>>(url);
  }

  // Get announcement by ID
  async getAnnouncement(id: string): Promise<Announcement> {
    const response = await this.makeRequest<ApiResponse<Announcement>>(`/announcements/${id}`);
    return response.data;
  }

  // Mark announcement as read
  async markAsRead(id: string): Promise<void> {
    await this.makeRequest(`/announcements/${id}/read`, {
      method: 'POST',
    });
  }

  // Get announcements list with optional filters
  async getAnnouncements(options: {
    limit?: number;
    offset?: number;
    user_view?: boolean;
    type?: string;
    priority?: string;
    target_audience?: string;
    published?: boolean;
  } = {}): Promise<PaginatedResponse<Announcement>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const queryString = params.toString();
    const endpoint = `announcements${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<PaginatedResponse<Announcement>>(endpoint);
  }

  // Get announcement statistics (CEO only) - with fallback handling
  async getStats(): Promise<{
    success: boolean;
    data: {
      total: number;
      published: number;
      scheduled: number;
      expired: number;
      active: number;
      recent: Announcement[];
    };
  }> {
    try {
      // Try the backend stats endpoint first
      const response = await this.makeRequest<ApiResponse<{
        total: number;
        published: number;
        scheduled: number;
        expired: number;
        byType: Record<string, number>;
        byPriority: Record<string, number>;
        byAudience: Record<string, number>;
      }>>('/announcements/stats');
      
      if (response.success && response.data) {
        const backendStats = response.data;
        
        // Calculate active from available data
        const active = backendStats.published - backendStats.expired;
        
        return {
          success: true,
          data: {
            total: backendStats.total,
            published: backendStats.published,
            scheduled: backendStats.scheduled,
            expired: backendStats.expired,
            active: Math.max(0, active),
            recent: [] // Backend stats don't include recent announcements
          }
        };
      }
    } catch (error) {
      console.warn('Backend stats endpoint failed, falling back to client-side calculation:', error);
    }
    
    // Fallback: Calculate stats client-side
    try {
      const response = await this.getAnnouncements({ limit: 100, user_view: false });
      
      if (!response.success) {
        throw new Error('Failed to fetch announcements for fallback stats');
      }
      
      const announcements = response.data;
      const now = new Date();
      
      const stats = {
        total: announcements.length,
        published: announcements.filter(a => a.published).length,
        scheduled: announcements.filter(a => a.scheduled_for && new Date(a.scheduled_for) > now).length,
        expired: announcements.filter(a => a.expires_at && new Date(a.expires_at) < now).length,
        active: announcements.filter(a => 
          a.published && 
          (!a.expires_at || new Date(a.expires_at) > now)
        ).length,
        recent: announcements.slice(0, 5)
      };
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Both backend and fallback stats calculation failed:', error);
      
      // Return empty stats instead of failing
      return {
        success: true, // Still return success with empty data
        data: {
          total: 0,
          published: 0,
          scheduled: 0,
          expired: 0,
          active: 0,
          recent: []
        }
      };
    }
  }
}

export const announcementService = new AnnouncementService();