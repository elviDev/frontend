import React from 'react';
import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { authService } from './api/authService';
import { tokenManager } from './tokenManager';
import { API_BASE_URL } from '../config/api';

export interface PushNotificationData {
  taskId?: string;
  channelId?: string;
  type: 'task_created' | 'task_updated' | 'task_assigned' | 'task_completed' | 'mention' | 'general';
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  actionText?: string;
  data?: Record<string, any>;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'undetermined' | 'denied' | 'granted';
}

export interface LocalNotificationConfig {
  id: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  sound?: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'max';
  vibrate?: boolean;
  playSound?: boolean;
  actions?: string[];
}

/**
 * Push Notification Service for task-related notifications
 */
class NotificationService {
  private fcmToken: string | null = null;
  private isInitialized: boolean = false;
  private notificationSubscription: any = null;
  private responseSubscription: any = null;

  constructor() {
    // Only configure push notifications if we're not in development or if Firebase is configured
    this.safeConfigurePushNotification();
  }

  /**
   * Safely configure React Native Push Notification
   */
  private safeConfigurePushNotification(): void {
    try {
      this.configurePushNotification();
    } catch (error) {
      console.warn('Failed to configure push notifications (Firebase not configured):', error);
      // Continue without push notifications
      this.isInitialized = false;
    }
  }

  /**
   * Configure React Native Push Notification
   */
  private configurePushNotification(): void {
    // Skip push notification configuration in development or if Firebase is not available
    if (__DEV__) {
      console.log('⚠️ Skipping push notification configuration in development mode');
      return;
    }

    PushNotification.configure({
      // Called when a remote notification is received
      onNotification: (notification) => {
        console.log('Notification received:', notification);
        if (notification.userInteraction) {
          // User tapped the notification
          this.handleNotificationResponse(notification);
        } else {
          // Notification received in foreground
          this.handleNotificationReceived(notification);
        }
      },

      // Called when a remote notification is received while app is in background
      onRegister: (token) => {
        console.log('Push notification token received:', token);
        this.fcmToken = token.token;
        this.registerTokenWithBackend();
      },

      // Called when registering for remote notifications fails
      onRegistrationError: (error) => {
        console.warn('Push notification registration failed:', error);
        // Don't crash the app
      },

      // iOS permissions
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,

      // Request permissions on app start (only in production)
      requestPermissions: false, // We'll request manually when needed
    });
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if device is physical device
      const isDevice = await DeviceInfo.isEmulator().then(result => !result);
      if (!isDevice) {
        console.warn('Push notifications work better on physical devices');
      }

      // Get permission status
      const permissionStatus = await this.getPermissionStatus();
      
      if (!permissionStatus.granted) {
        if (permissionStatus.canAskAgain) {
          const requested = await this.requestPermissions();
          if (!requested.granted) {
            return false;
          }
        } else {
          return false;
        }
      }

      // Configure push notification channels for Android
      if (Platform.OS === 'android') {
        this.createNotificationChannels();
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Get current permission status
   */
  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    return new Promise((resolve) => {
      if (Platform.OS === 'ios') {
        PushNotificationIOS.checkPermissions((permissions) => {
          const granted = permissions.alert && permissions.badge && permissions.sound;
          resolve({
            granted: !!granted,
            canAskAgain: !granted, // iOS allows asking again
            status: granted ? 'granted' : 'denied',
          });
        });
      } else {
        // Android - assume granted by default (permissions are requested at install time)
        resolve({
          granted: true,
          canAskAgain: true,
          status: 'granted',
        });
      }
    });
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<NotificationPermissionStatus> {
    return new Promise((resolve) => {
      if (Platform.OS === 'ios') {
        PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
        }).then((permissions) => {
          const granted = permissions.alert && permissions.badge && permissions.sound;
          resolve({
            granted: !!granted,
            canAskAgain: !granted,
            status: granted ? 'granted' : 'denied',
          });
        });
      } else {
        // Android - permissions are handled by the system
        resolve({
          granted: true,
          canAskAgain: true,
          status: 'granted',
        });
      }
    });
  }

  /**
   * Create notification channels for Android
   */
  private createNotificationChannels(): void {
    if (Platform.OS !== 'android') return;

    const channels = [
      {
        channelId: 'task_notifications',
        channelName: 'Task Notifications',
        channelDescription: 'Notifications for task-related activities',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      {
        channelId: 'channel_notifications',
        channelName: 'Channel Notifications', 
        channelDescription: 'Notifications for channel activities',
        playSound: true,
        soundName: 'default',
        importance: 3,
        vibrate: true,
      },
      {
        channelId: 'mention_notifications',
        channelName: 'Mention Notifications',
        channelDescription: 'Notifications when you are mentioned',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
    ];

    channels.forEach(channel => {
      PushNotification.createChannel(channel, () => {
        console.log(`Created notification channel: ${channel.channelId}`);
      });
    });
  }

  /**
   * Register push token with backend
   */
  private async registerTokenWithBackend(): Promise<void> {
    if (!this.fcmToken) return;

    try {
      const [brand, model, systemName, systemVersion] = await Promise.all([
        DeviceInfo.getBrand(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemName(),
        DeviceInfo.getSystemVersion(),
      ]);

      const token = await tokenManager.getCurrentToken();


      const response = await fetch(`${API_BASE_URL}/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          token: this.fcmToken,
          platform: Platform.OS,
          deviceInfo: {
            brand,
            modelName: model,
            osName: systemName,
            osVersion: systemVersion,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to register push token:', error);
      // Don't throw error to prevent initialization failure
    }
  }

  /**
   * Setup notification event listeners
   */
  private setupNotificationListeners(): void {
    // Event listeners are handled in the PushNotification.configure() method
    // No additional setup needed for react-native-push-notification
  }

  /**
   * Handle received notification (app in foreground)
   */
  private handleNotificationReceived = (notification: any) => {
    const data = notification.data as PushNotificationData;
    
    console.log('Notification received:', {
      title: notification.title,
      body: notification.message,
      data,
    });

    // You can show custom in-app notification here
    // Or update app badge, play custom sound, etc.
    this.updateAppBadge();
  };

  /**
   * Handle notification response (user tapped notification)
   */
  private handleNotificationResponse = (notification: any) => {
    const data = notification.data as PushNotificationData;
    
    console.log('Notification tapped:', data);

    // Navigate to relevant screen based on notification data
    this.handleNavigationFromNotification(data);
  };

  /**
   * Handle navigation from notification tap
   */
  private handleNavigationFromNotification(data: PushNotificationData): void {
    // This would integrate with your navigation system
    // Example implementations:
    
    switch (data.type) {
      case 'task_created':
      case 'task_updated':
      case 'task_assigned':
        if (data.taskId) {
          // Navigate to task detail screen
          // navigationRef.navigate('TaskDetailScreen', { taskId: data.taskId });
        }
        break;
        
      case 'mention':
        if (data.channelId) {
          // Navigate to channel
          // navigationRef.navigate('ChannelDetail', { channelId: data.channelId });
        }
        break;
        
      default:
        if (data.actionUrl) {
          // Handle custom action URL
        }
    }
  }

  /**
   * Send push notifications to channel members
   */
  async sendChannelNotification(options: {
    channelId: string;
    senderId: string;
    senderName: string;
    message: string;
    type: 'new_message' | 'thread_reply';
    parentMessageId?: string;
  }): Promise<void> {
    try {
      const token = await tokenManager.getCurrentToken();
      const response = await fetch(`${API_BASE_URL}/notifications/channel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          channelId: options.channelId,
          senderId: options.senderId,
          senderName: options.senderName,
          message: options.message,
          type: options.type,
          parentMessageId: options.parentMessageId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('✅ Channel notification sent successfully');
    } catch (error) {
      console.warn('⚠️ Failed to send channel notification (continuing without notifications):', error);
      // Don't throw error - continue without notifications
    }
  }

  /**
   * Schedule local notification
   */
  async scheduleLocalNotification(
    notification: PushNotificationData,
    date?: Date
  ): Promise<string> {
    const notificationId = Date.now().toString();
    
    const notificationConfig: any = {
      id: notificationId,
      title: notification.title,
      message: notification.body,
      userInfo: notification,
      priority: this.mapPriorityToAndroid(notification.priority),
      soundName: notification.priority === 'critical' ? 'notification.wav' : 'default',
      playSound: true,
      vibrate: true,
      number: 1,
    };

    if (date) {
      notificationConfig.date = date;
    }

    PushNotification.localNotification(notificationConfig);
    
    return notificationId;
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    PushNotification.cancelLocalNotifications({ id: notificationId });
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    PushNotification.cancelAllLocalNotifications();
  }

  /**
   * Get pending notifications
   */
  async getPendingNotifications(): Promise<any[]> {
    return new Promise((resolve) => {
      PushNotification.getScheduledLocalNotifications((notifications) => {
        resolve(notifications);
      });
    });
  }

  /**
   * Update app badge count
   */
  async updateAppBadge(count?: number): Promise<void> {
    if (Platform.OS === 'ios') {
      if (count !== undefined) {
        PushNotificationIOS.setApplicationIconBadgeNumber(count);
      } else {
        // Get current badge and increment
        PushNotificationIOS.getApplicationIconBadgeNumber((currentBadge) => {
          PushNotificationIOS.setApplicationIconBadgeNumber(currentBadge + 1);
        });
      }
    }
    // Android doesn't support badges natively
  }

  /**
   * Clear app badge
   */
  async clearAppBadge(): Promise<void> {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(0);
    }
  }

  /**
   * Send notification preferences to backend
   */
  async updateNotificationPreferences(preferences: {
    taskNotifications: boolean;
    mentionNotifications: boolean;
    channelNotifications: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }): Promise<void> {
    try {
      const token = await tokenManager.getCurrentToken();
      const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences from backend
   */
  async getNotificationPreferences(): Promise<any> {
    try {
      const token = await tokenManager.getCurrentToken();
      const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      throw error;
    }
  }

  /**
   * Test notification (for debugging)
   */
  async sendTestNotification(): Promise<void> {
    await this.scheduleLocalNotification({
      type: 'general',
      title: 'Test Notification',
      body: 'This is a test notification from the app',
      priority: 'medium',
    });
  }

  /**
   * Map priority to Android notification priority
   */
  private mapPriorityToAndroid(priority: string): 'max' | 'high' | 'default' | 'low' | 'min' {
    switch (priority) {
      case 'critical':
        return 'max';
      case 'high':
        return 'high';
      case 'medium':
        return 'default';
      case 'low':
        return 'low';
      default:
        return 'default';
    }
  }

  /**
   * Get push token (public method)
   */
  getToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Check if notifications are enabled
   */
  async isEnabled(): Promise<boolean> {
    const status = await this.getPermissionStatus();
    return status.granted;
  }

  /**
   * Cleanup notification listeners
   */
  cleanup(): void {
    // Cleanup is handled by PushNotification internally
    // Reset local subscription references
    this.notificationSubscription = null;
    this.responseSubscription = null;
  }

  /**
   * Handle app state changes
   */
  async handleAppStateChange(nextAppState: string): Promise<void> {
    if (nextAppState === 'background') {
      // App went to background, update badge if needed
      // You might want to sync unread count with backend
    } else if (nextAppState === 'active') {
      // App came to foreground, clear badge
      await this.clearAppBadge();
    }
  }
}

export const notificationService = new NotificationService();

// React Hook for notification integration
export function useNotifications() {
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const initialize = async () => {
    setLoading(true);
    const enabled = await notificationService.initialize();
    setIsEnabled(enabled);
    setLoading(false);
    return enabled;
  };

  const requestPermissions = async () => {
    const status = await notificationService.requestPermissions();
    setIsEnabled(status.granted);
    return status;
  };

  const getStatus = async () => {
    return await notificationService.getPermissionStatus();
  };

  const scheduleNotification = (notification: PushNotificationData) => {
    return notificationService.scheduleLocalNotification(notification);
  };

  const updatePreferences = (preferences: any) => {
    return notificationService.updateNotificationPreferences(preferences);
  };

  React.useEffect(() => {
    // Check initial status
    notificationService.getPermissionStatus().then(status => {
      setIsEnabled(status.granted);
    });

    // Cleanup on unmount
    return () => {
      notificationService.cleanup();
    };
  }, []);

  return {
    isEnabled,
    loading,
    initialize,
    requestPermissions,
    getStatus,
    scheduleNotification,
    updatePreferences,
    token: notificationService.getToken(),
  };
}

export default notificationService;