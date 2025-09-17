export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'channel_invitation' | 'task_assignment' | 'meeting_invitation' | 'reminder';
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

export class NotificationService {
  private static notifications: Notification[] = [];

  static async sendNotification(notificationData: Omit<Notification, 'id' | 'read' | 'createdAt'>): Promise<void> {
    try {
      const notification: Notification = {
        ...notificationData,
        id: Date.now().toString(),
        read: false,
        createdAt: new Date(),
      };

      this.notifications.push(notification);

      // Simulate push notification
      await this.sendPushNotification(notification);
      
      console.log('Notification sent:', notification);
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  static async getNotifications(userId: string): Promise<Notification[]> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return this.notifications
        .filter(notification => notification.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      throw new Error('Failed to fetch notifications');
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
      }
    } catch (error) {
      throw new Error('Failed to mark notification as read');
    }
  }

  private static async sendPushNotification(notification: Notification): Promise<void> {
    // Here you would integrate with a push notification service
    // like Firebase Cloud Messaging, OneSignal, etc.
    
    // For now, we'll just simulate the push notification
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // You could also show a local notification here
    console.log('Push notification sent:', {
      title: notification.title,
      body: notification.message,
      userId: notification.userId,
    });
  }

  static async scheduleReminder(reminderData: {
    userId: string;
    title: string;
    message: string;
    scheduleTime: Date;
    data?: Record<string, any>;
  }): Promise<void> {
    try {
      const delay = reminderData.scheduleTime.getTime() - Date.now();
      
      if (delay > 0) {
        setTimeout(async () => {
          await this.sendNotification({
            userId: reminderData.userId,
            title: reminderData.title,
            message: reminderData.message,
            type: 'reminder',
            data: reminderData.data,
          });
        }, delay);
      }
    } catch (error) {
      throw new Error('Failed to schedule reminder');
    }
  }
}