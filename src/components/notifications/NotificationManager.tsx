import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  selectUserAnnouncements,
  selectUnreadAnnouncementCount,
  fetchAnnouncements,
  markAnnouncementAsRead,
} from '../../store/slices/announcementSlice';
import { AnnouncementNotification } from './AnnouncementNotification';
import { Announcement } from '../../types/announcement.types';

interface NotificationManagerProps {
  maxVisible?: number; // Maximum number of notifications to show at once
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  maxVisible = 3
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const userAnnouncements = useSelector(selectUserAnnouncements);
  const unreadCount = useSelector(selectUnreadAnnouncementCount);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load announcements on mount
    dispatch(fetchAnnouncements());
  }, [dispatch]);

  useEffect(() => {
    // Show new unread announcements that haven't been dismissed
    const unreadAnnouncements = userAnnouncements
      .filter(announcement => 
        !announcement.readBy.includes(user?.id || '') &&
        !dismissedNotifications.has(announcement.id) &&
        shouldShowAnnouncement(announcement)
      )
      .sort((a, b) => {
        // Sort by priority (critical first) then by creation date (newest first)
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, maxVisible)
      .map(announcement => announcement.id);

    setVisibleNotifications(unreadAnnouncements);
  }, [userAnnouncements, dismissedNotifications, user?.id, maxVisible]);

  const shouldShowAnnouncement = (announcement: Announcement): boolean => {
    // Don't show if not published
    if (!announcement.published) return false;
    
    // Don't show if expired
    if (announcement.expiresAt && new Date(announcement.expiresAt) < new Date()) return false;
    
    // Don't show if scheduled for future
    if (announcement.scheduledFor && new Date(announcement.scheduledFor) > new Date()) return false;
    
    // Show if it's new (created within last 24 hours) or high/critical priority
    const isNew = new Date(announcement.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000;
    const isHighPriority = ['high', 'critical'].includes(announcement.priority);
    
    return isNew || isHighPriority;
  };

  const handleDismiss = (announcementId: string) => {
    // Add to dismissed set
    setDismissedNotifications(prev => new Set([...prev, announcementId]));
    
    // Remove from visible notifications
    setVisibleNotifications(prev => prev.filter(id => id !== announcementId));
    
    // Mark as read if user is logged in
    if (user?.id) {
      const announcement = userAnnouncements.find(a => a.id === announcementId);
      if (announcement && !announcement.readBy.includes(user.id)) {
        dispatch(markAnnouncementAsRead({ id: announcementId, userId: user.id }));
      }
    }
  };

  const visibleAnnouncementData = userAnnouncements.filter(announcement =>
    visibleNotifications.includes(announcement.id)
  );

  if (!user?.id || visibleAnnouncementData.length === 0) {
    return null;
  }

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
      {visibleAnnouncementData.map((announcement, index) => (
        <View
          key={announcement.id}
          style={{ 
            marginTop: index * 80, // Offset each notification
            zIndex: 1000 - index // Higher z-index for earlier notifications
          }}
        >
          <AnnouncementNotification
            announcement={announcement}
            onDismiss={handleDismiss}
            userId={user.id}
          />
        </View>
      ))}
    </View>
  );
};