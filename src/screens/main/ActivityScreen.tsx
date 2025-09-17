import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useWebSocket } from '../../services/websocketService';
import { activityService, Activity } from '../../services/api/activityService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'task_assigned' | 'notification' | 'announcement' | 'channel_created' | 'user_joined' | 'file_uploaded' | 'message_sent';
  title: string;
  description: string;
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  read: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export const ActivityScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state: RootState) => state.auth);
  const { on, off, joinChannel, leaveChannel } = useWebSocket();
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'tasks' | 'announcements' | 'system'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const fadeAnim = new Animated.Value(0);

  // Initialize and fetch data
  useEffect(() => {
    loadActivities();
    setupWebSocketListeners();
    
    return () => {
      cleanupWebSocketListeners();
    };
  }, []);



  const loadActivities = async () => {
    try {
      setLoading(true);
      console.log('ActivityScreen: Loading activities from backend API...', {
        userId: user?.id,
        userExists: !!user
      });
      
      // Load activities from the backend with user filtering
      const response = await activityService.getActivities({
        limit: 100,
        offset: 0,
        user_id: user?.id, // Filter by current user if available
      });

      console.log('ActivityScreen: API response received', { 
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data ? response.data.length : 0,
        pagination: response.pagination,
        data: response.data
      });

      if (response.success && response.data && Array.isArray(response.data)) {
        // Transform backend activities to frontend format
        const transformedActivities: ActivityItem[] = response.data.map((activity: Activity) => ({
          id: activity.id,
          type: activity.type as any,
          title: activity.title,
          description: activity.description,
          timestamp: new Date(activity.created_at),
          priority: activity.metadata?.priority,
          data: activity.metadata,
          read: activity.metadata?.read || false, // Use backend read status
          user: activity.user,
        }));

        // Sort by timestamp (newest first)
        transformedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setActivities(transformedActivities);
        setError(null); // Clear any previous errors
        console.log('ActivityScreen: Activities loaded successfully', { 
          count: transformedActivities.length,
          unreadCount: transformedActivities.filter(a => !a.read).length
        });

        // Update unread count
        const unreadItems = transformedActivities.filter(a => !a.read);
        setUnreadCount(unreadItems.length);
      } else {
        // Backend returned successful response but no data - this is normal for empty database
        console.log('ActivityScreen: No activities found in database');
        setActivities([]);
        setUnreadCount(0);
        setError(null); // Clear any previous errors - this is not an error state
      }
    } catch (error) {
      console.error('ActivityScreen: Failed to load activities from backend', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('ActivityScreen: Error details:', { message: errorMessage });
      
      // On error, set empty array and show error state
      setActivities([]);
      setUnreadCount(0);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocketListeners = () => {
    // Listen for real-time notifications
    const unsubscribeNotification = on('notification', (notification: any) => {
      addActivityItem({
        id: notification.notificationId,
        type: 'notification',
        title: notification.title,
        description: notification.message,
        timestamp: new Date(notification.createdAt),
        priority: notification.priority,
        data: notification.data,
        read: false,
      });
    });
    
    // Listen for task updates
    const unsubscribeTaskUpdate = on('task_update', (event: any) => {
      handleTaskUpdateActivity(event);
    });
    
    return () => {
      unsubscribeNotification();
      unsubscribeTaskUpdate();
    };
  };

  const cleanupWebSocketListeners = () => {
    off('notification');
    off('task_update');
  };

  const handleTaskUpdateActivity = (event: any) => {
    let activityItem: ActivityItem | null = null;
    
    switch (event.type) {
      case 'task_created':
        activityItem = {
          id: `create_${event.taskId}_${Date.now()}`,
          type: 'task_created',
          title: 'New Task Created',
          description: `"${event.task.title}" was created`,
          timestamp: new Date(),
          priority: event.task.priority,
          data: { task: event.task, user: event.userName },
          read: false,
        };
        break;
        
      case 'task_completed':
        activityItem = {
          id: `complete_${event.taskId}_${Date.now()}`,
          type: 'task_completed',
          title: 'Task Completed',
          description: `"${event.task.title}" was completed by ${event.userName}`,
          timestamp: new Date(),
          priority: event.task.priority,
          data: { task: event.task, user: event.userName },
          read: false,
        };
        break;
        
      case 'task_updated':
        if (event.action === 'assign') {
          activityItem = {
            id: `assign_${event.taskId}_${Date.now()}`,
            type: 'task_assigned',
            title: 'Task Assignment',
            description: `"${event.task.title}" assignment was updated`,
            timestamp: new Date(),
            priority: event.task.priority,
            data: { task: event.task, user: event.userName, changes: event.changes },
            read: false,
          };
        } else {
          activityItem = {
            id: `update_${event.taskId}_${Date.now()}`,
            type: 'task_updated',
            title: 'Task Updated',
            description: `"${event.task.title}" was updated by ${event.userName}`,
            timestamp: new Date(),
            priority: event.task.priority,
            data: { task: event.task, user: event.userName, changes: event.changes },
            read: false,
          };
        }
        break;
    }
    
    if (activityItem) {
      addActivityItem(activityItem);
    }
  };

  const addActivityItem = (item: ActivityItem) => {
    setActivities(prev => {
      const filtered = prev.filter(a => a.id !== item.id);
      const newActivities = [item, ...filtered].slice(0, 100);
      
      // Update unread count
      const unreadItems = newActivities.filter(a => !a.read);
      setUnreadCount(unreadItems.length);
      
      return newActivities;
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setError(null); // Clear any previous errors when refreshing
      await loadActivities();
    } finally {
      setRefreshing(false);
    }
  };

  const markAsRead = (activityId: string) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, read: true }
          : activity
      )
    );
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setActivities(prev => 
      prev.map(activity => ({ ...activity, read: true }))
    );
    setUnreadCount(0);
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'tasks') return activity.type.startsWith('task_');
    if (filter === 'announcements') return activity.type === 'announcement';
    if (filter === 'system') return ['channel_created', 'user_joined', 'file_uploaded', 'message_sent'].includes(activity.type);
    return true;
  });

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'urgent': return 'text-yellow-600';
      case 'medium': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_created': return '➕';
      case 'task_completed': return '✅';
      case 'task_assigned': return '👤';
      case 'task_updated': return '✏️';
      case 'notification': return '🔔';
      case 'announcement': return '📢';
      case 'channel_created': return '📁';
      case 'user_joined': return '👋';
      case 'file_uploaded': return '📎';
      case 'message_sent': return '💬';
      default: return '📋';
    }
  };

  console.log("ACTIVITIES:", filteredActivities)

  const renderActivityItem = ({ item }: { item: ActivityItem }) => (
    <TouchableOpacity
      key={item.id}
      className={`mx-4 mb-3 p-4 rounded-xl ${
        item.read ? 'bg-white' : 'bg-blue-50 border border-blue-200'
      } shadow-sm`}
      onPress={() => !item.read && markAsRead(item.id)}
      // activeOpacity={0.9}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-start flex-1">
          <Text className="text-2xl mr-3 mt-0.5">{getActivityIcon(item.type)}</Text>
          <View className="flex-1">
            <Text className="text-gray-900 font-semibold text-base mb-1">{item.title}</Text>
            <Text className="text-gray-600 text-sm mb-2 leading-5">{item.description}</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-400 text-xs">{formatTimestamp(item.timestamp)}</Text>
              {item.priority && (
                <Text className={`text-xs font-medium ${getPriorityColor(item.priority)} capitalize`}>
                  {item.priority}
                </Text>
              )}
            </View>
          </View>
        </View>
        {!item.read && (
          <View className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-2" />
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && activities.length === 0) {
    return (
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <Animated.View 
      className="flex-1 bg-gray-50" 
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-4 py-6 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-gray-900 text-2xl font-bold">Activity</Text>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              className="bg-blue-500 px-3 py-1 rounded-full"
            >
              <Text className="text-white text-sm font-medium">
                Mark all read ({unreadCount})
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Filter Tabs */}
        <View className="flex-row">
          {[
            { key: 'all', label: 'All' }, 
            { key: 'tasks', label: 'Tasks' }, 
            { key: 'announcements', label: 'Announcements' }, 
            { key: 'system', label: 'System' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilter(tab.key as any)}
              className={`mr-4 pb-2 border-b-2 ${
                filter === tab.key ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <Text className={`font-medium ${
                filter === tab.key ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Activity List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingVertical: 16 }}
      >
        {filteredActivities.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4 py-20">
            {error ? (
              // Error state
              <>
                <Text className="text-6xl mb-4">🚨</Text>
                <Text className="text-gray-900 text-xl font-semibold mb-2 text-center">
                  Unable to Load Activities
                </Text>
                <Text className="text-gray-500 text-center leading-6 mb-6">
                  There was a problem connecting to the server.{'\n'}
                  Please check your connection and try again.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setError(null);
                    loadActivities();
                  }}
                  className="bg-blue-500 px-6 py-3 rounded-lg"
                >
                  <Text className="text-white font-semibold">Try Again</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Empty database state
              <>
                <Text className="text-6xl mb-4">📭</Text>
                <Text className="text-gray-500 text-lg font-medium mb-2">No activities yet</Text>
                <Text className="text-gray-400 text-center">
                  When you interact with tasks or receive notifications,{'\n'}they'll appear here.
                </Text>
              </>
            )}
          </View>
        ) : (
          filteredActivities.map((item) => renderActivityItem({ item }))
        )}
      </ScrollView>
    </Animated.View>
  );
};