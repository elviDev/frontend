export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'feature' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetAudience: 'all' | 'admins' | 'developers' | 'designers' | 'managers';
  scheduledFor?: Date;
  expiresAt?: Date;
  actionButton?: {
    text: string;
    url: string;
  };
  imageUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  published: boolean;
  readBy: string[]; // User IDs who have seen this announcement
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  type: Announcement['type'];
  priority: Announcement['priority'];
  targetAudience: Announcement['targetAudience'];
  scheduledFor?: Date;
  expiresAt?: Date;
  actionButton?: {
    text: string;
    url: string;
  };
  imageUrl?: string;
  published?: boolean;
}

export interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  type?: Announcement['type'];
  priority?: Announcement['priority'];
  targetAudience?: Announcement['targetAudience'];
  scheduledFor?: Date;
  expiresAt?: Date;
  actionButton?: {
    text: string;
    url: string;
  };
  imageUrl?: string;
  published?: boolean;
}

export interface AnnouncementFilter {
  type?: Announcement['type'][];
  priority?: Announcement['priority'][];
  targetAudience?: Announcement['targetAudience'][];
  published?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  createdBy?: string[];
}

export interface AnnouncementStats {
  total: number;
  published: number;
  scheduled: number;
  expired: number;
  byType: Record<Announcement['type'], number>;
  byPriority: Record<Announcement['priority'], number>;
  byAudience: Record<Announcement['targetAudience'], number>;
  totalReads: number;
  averageReadRate: number;
}