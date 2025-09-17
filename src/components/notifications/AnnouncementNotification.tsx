import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  Linking,
  Dimensions,
  PanGestureHandler,
  State,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { markAnnouncementAsRead } from '../../store/slices/announcementSlice';
import { Announcement } from '../../types/announcement.types';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface AnnouncementNotificationProps {
  announcement: Announcement;
  onDismiss: (id: string) => void;
  userId: string;
}

const { width: screenWidth } = Dimensions.get('window');

export const AnnouncementNotification: React.FC<AnnouncementNotificationProps> = ({
  announcement,
  onDismiss,
  userId,
}) => {
  const dispatch = useDispatch();
  const slideAnim = useRef(new Animated.Value(-screenWidth)).current;
  const panAnim = useRef(new Animated.Value(0)).current;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Auto-dismiss for low priority announcements after 5 seconds
    if (announcement.priority === 'low') {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = async () => {
    if (dismissed) return;
    setDismissed(true);

    // Mark as read if not already
    if (!announcement.readBy.includes(userId)) {
      dispatch(markAnnouncementAsRead({ id: announcement.id, userId }));
    }

    // Slide out animation
    Animated.timing(slideAnim, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss(announcement.id);
    });
  };

  const handleActionButton = async () => {
    if (!announcement.actionButton?.url) return;

    try {
      const canOpen = await Linking.canOpenURL(announcement.actionButton.url);
      if (canOpen) {
        await Linking.openURL(announcement.actionButton.url);
      }
    } catch (error) {
      console.warn('Failed to open URL:', error);
    }
  };

  const handlePanGesture = Animated.event(
    [{ nativeEvent: { translationX: panAnim } }],
    { useNativeDriver: false }
  );

  const handlePanStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const { translationX, velocityX } = nativeEvent;
      
      // If swiped far enough or fast enough, dismiss
      if (Math.abs(translationX) > screenWidth * 0.3 || Math.abs(velocityX) > 1000) {
        handleDismiss();
      } else {
        // Return to original position
        Animated.spring(panAnim, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  const getTypeIcon = (type: Announcement['type']) => {
    switch (type) {
      case 'info': return 'info';
      case 'warning': return 'alert-triangle';
      case 'success': return 'check-circle';
      case 'error': return 'x-circle';
      case 'feature': return 'star';
      case 'maintenance': return 'tool';
      default: return 'bell';
    }
  };

  const getTypeColor = (type: Announcement['type']) => {
    switch (type) {
      case 'info': return '#3B82F6';
      case 'warning': return '#F59E0B';
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'feature': return '#8B5CF6';
      case 'maintenance': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getBackgroundColor = (type: Announcement['type']) => {
    switch (type) {
      case 'info': return '#EFF6FF';
      case 'warning': return '#FFFBEB';
      case 'success': return '#ECFDF5';
      case 'error': return '#FEF2F2';
      case 'feature': return '#F3E8FF';
      case 'maintenance': return '#F9FAFB';
      default: return '#F9FAFB';
    }
  };

  const getPriorityBorder = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#F97316';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (dismissed) return null;

  return (
    <Animated.View
      style={{
        transform: [
          { translateX: slideAnim },
          { translateX: panAnim },
        ],
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 1000,
      }}
    >
      <PanGestureHandler
        onGestureEvent={handlePanGesture}
        onHandlerStateChange={handlePanStateChange}
      >
        <Animated.View>
          <View
            className=\"rounded-xl shadow-lg overflow-hidden\"
            style={{
              backgroundColor: getBackgroundColor(announcement.type),
              borderLeftWidth: 4,
              borderLeftColor: getPriorityBorder(announcement.priority),
            }}
          >
            {/* Header */}
            <View className=\"flex-row items-start p-4 pb-3\">
              <View 
                className=\"w-10 h-10 rounded-full items-center justify-center mr-3\"
                style={{ backgroundColor: `${getTypeColor(announcement.type)}20` }}
              >
                <Icon 
                  name={getTypeIcon(announcement.type)} 
                  size={20} 
                  color={getTypeColor(announcement.type)} 
                />
              </View>
              
              <View className=\"flex-1\">
                <View className=\"flex-row items-center justify-between mb-1\">
                  <Text className=\"text-gray-900 font-bold text-base flex-1\" numberOfLines={2}>
                    {announcement.title}
                  </Text>
                  <TouchableOpacity
                    onPress={handleDismiss}
                    className=\"ml-2 p-1\"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name=\"x\" size={20} color=\"#6B7280\" />
                  </TouchableOpacity>
                </View>
                
                <Text className=\"text-gray-700 text-sm leading-5\" numberOfLines={3}>
                  {announcement.content}
                </Text>
              </View>
            </View>

            {/* Image */}
            {announcement.imageUrl && (
              <View className=\"px-4 pb-3\">
                <Image 
                  source={{ uri: announcement.imageUrl }} 
                  className=\"w-full h-32 rounded-lg\"
                  resizeMode=\"cover\"
                />
              </View>
            )}

            {/* Action Button and Footer */}
            <View className=\"px-4 pb-4\">
              {announcement.actionButton && (
                <TouchableOpacity 
                  className=\"mb-3 py-3 px-4 rounded-lg items-center\"
                  style={{ backgroundColor: getTypeColor(announcement.type) }}
                  onPress={handleActionButton}
                  activeOpacity={0.8}
                >
                  <Text className=\"text-white font-semibold\">
                    {announcement.actionButton.text}
                  </Text>
                </TouchableOpacity>
              )}
              
              <View className=\"flex-row items-center justify-between\">
                <View className=\"flex-row items-center\">
                  <View 
                    className=\"px-2 py-1 rounded-full mr-2\"
                    style={{ backgroundColor: `${getPriorityBorder(announcement.priority)}20` }}
                  >
                    <Text 
                      className=\"text-xs font-medium capitalize\"
                      style={{ color: getPriorityBorder(announcement.priority) }}
                    >
                      {announcement.priority}
                    </Text>
                  </View>
                  <Text className=\"text-gray-500 text-xs\">
                    {new Date(announcement.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
                
                <Text className=\"text-gray-400 text-xs\">
                  Swipe to dismiss
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
};