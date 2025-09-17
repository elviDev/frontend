import { apiClient } from './index';
import { ApiResponse } from '../../types/api.types';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'feature' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_audience: 'all' | 'admins' | 'developers' | 'designers' | 'managers';
  scheduled_for?: string | null;
  expires_at?: string | null;
  action_button_text?: string | null;
  action_button_url?: string | null;
  image_url?: string | null;
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
  scheduled_for?: string;
  expires_at?: string;
  action_button_text?: string;
  action_button_url?: string;
  image_url?: string;
  published?: boolean;
}

export interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  type?: Announcement['type'];
  priority?: Announcement['priority'];
  target_audience?: Announcement['target_audience'];
  scheduled_for?: string | null;
  expires_at?: string | null;
  action_button_text?: string | null;
  action_button_url?: string | null;
  image_url?: string | null;
  published?: boolean;
}

export interface AnnouncementFilter {
  type?: string;
  priority?: string;
  target_audience?: string;
  published?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  limit?: string;
  offset?: string;
  user_view?: string;
}

export interface AnnouncementStats {
  total: number;
  published: number;
  scheduled: number;
  expired: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  byAudience: Record<string, number>;
}

export class AnnouncementService {
  /**
   * Create a new announcement (CEO only)
   */
  async createAnnouncement(data: CreateAnnouncementData): Promise<ApiResponse<Announcement>> {
    try {
      const response = await apiClient.post('/announcements', data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create announcement:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to create announcement');
    }
  }

  /**
   * Get announcements with optional filtering
   */
  async getAnnouncements(filter: AnnouncementFilter = {}): Promise<ApiResponse<{
    data: Announcement[];
    total: number;
    limit: number;
    offset: number;
  }>> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiClient.get(`/announcements?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get announcements:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to get announcements');
    }
  }

  /**
   * Get announcements visible to the current user
   */
  async getUserAnnouncements(includeRead: boolean = true): Promise<ApiResponse<{
    data: Announcement[];
    total: number;
    limit: number;
    offset: number;
  }>> {
    try {
      const params = new URLSearchParams({
        user_view: 'true',
        limit: '50',
        offset: '0'
      });

      const response = await apiClient.get(`/announcements?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get user announcements:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to get user announcements');
    }
  }

  /**
   * Get announcement by ID
   */
  async getAnnouncementById(id: string): Promise<ApiResponse<Announcement>> {
    try {
      const response = await apiClient.get(`/announcements/${id}`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to get announcement ${id}:`, error);
      throw new Error(error.response?.data?.error?.message || 'Failed to get announcement');
    }
  }

  /**
   * Update an announcement (CEO only)
   */
  async updateAnnouncement(id: string, data: UpdateAnnouncementData): Promise<ApiResponse<Announcement>> {
    try {
      const response = await apiClient.put(`/announcements/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to update announcement ${id}:`, error);
      throw new Error(error.response?.data?.error?.message || 'Failed to update announcement');
    }
  }

  /**
   * Delete an announcement (CEO only)
   */
  async deleteAnnouncement(id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.delete(`/announcements/${id}`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to delete announcement ${id}:`, error);
      throw new Error(error.response?.data?.error?.message || 'Failed to delete announcement');
    }
  }

  /**
   * Mark an announcement as read
   */
  async markAsRead(id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.post(`/announcements/${id}/read`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to mark announcement ${id} as read:`, error);
      throw new Error(error.response?.data?.error?.message || 'Failed to mark announcement as read');
    }
  }

  /**
   * Get announcement statistics (CEO only)
   */
  async getStats(): Promise<ApiResponse<AnnouncementStats>> {
    try {
      const response = await apiClient.get('/announcements/stats');
      return response.data;
    } catch (error: any) {
      console.error('Failed to get announcement stats:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to get announcement statistics');
    }
  }

  /**
   * Get unread announcement count for the current user
   */
  async getUnreadCount(): Promise<number> {
    try {
      const announcements = await this.getUserAnnouncements();
      const currentUserId = 'current-user-id'; // This should come from auth context
      
      return announcements.data.data.filter(
        announcement => !announcement.read_by.includes(currentUserId)
      ).length;
    } catch (error: any) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Helper method to format announcement date
   */
  formatAnnouncementDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  /**
   * Helper method to get announcement type color
   */
  getAnnouncementTypeColor(type: Announcement['type']): string {
    switch (type) {
      case 'success': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'error': return '#EF4444';
      case 'feature': return '#8B5CF6';
      case 'maintenance': return '#6B7280';
      case 'info':
      default:
        return '#3B82F6';
    }
  }

  /**
   * Helper method to get announcement priority color
   */
  getAnnouncementPriorityColor(priority: Announcement['priority']): string {
    switch (priority) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      case 'low':
      default:
        return '#65A30D';
    }
  }

  /**
   * Helper method to check if announcement is expired
   */
  isExpired(announcement: Announcement): boolean {
    if (!announcement.expires_at) return false;
    return new Date(announcement.expires_at) < new Date();
  }

  /**
   * Helper method to check if announcement is scheduled for the future
   */
  isScheduled(announcement: Announcement): boolean {
    if (!announcement.scheduled_for) return false;
    return new Date(announcement.scheduled_for) > new Date();
  }

  /**
   * Helper method to check if announcement is currently active
   */
  isActive(announcement: Announcement): boolean {
    if (!announcement.published) return false;
    if (this.isExpired(announcement)) return false;
    if (this.isScheduled(announcement)) return false;
    return true;
  }
}

export const announcementService = new AnnouncementService();
export default announcementService;