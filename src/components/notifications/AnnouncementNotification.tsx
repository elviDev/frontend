import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Feather';

interface AnnouncementNotificationProps {
  announcement: {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success' | 'error';
    priority: 'low' | 'medium' | 'high';
    imageUrl?: string;
    actionButton?: {
      text: string;
      action: () => void;
    };
    createdAt: string;
  };
  onDismiss: () => void;
  onActionPress?: () => void;
}

export const AnnouncementNotification: React.FC<AnnouncementNotificationProps> = ({
  announcement,
  onDismiss,
  onActionPress
}) => {
  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success': return '#F0FDF4';
      case 'warning': return '#FFFBEB';
      case 'error': return '#FEF2F2';
      default: return '#F8FAFC';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'error': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'warning': return 'alert-triangle';
      case 'error': return 'alert-circle';
      default: return 'info';
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#10B981';
    }
  };

  return (
    <Animated.View className="mx-4 mb-4">
      <PanGestureHandler>
        <Animated.View>
          <View
            className="rounded-xl shadow-lg overflow-hidden"
            style={{
              backgroundColor: getBackgroundColor(announcement.type),
              borderLeftWidth: 4,
              borderLeftColor: getPriorityBorder(announcement.priority),
            }}
          >
            {/* Header */}
            <View className="flex-row items-start p-4 pb-3">
              <View 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${getTypeColor(announcement.type)}20` }}
              >
                <Icon 
                  name={getTypeIcon(announcement.type)} 
                  size={20} 
                  color={getTypeColor(announcement.type)} 
                />
              </View>
              
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-gray-900 font-bold text-base flex-1" numberOfLines={2}>
                    {announcement.title}
                  </Text>
                  <TouchableOpacity
                    onPress={onDismiss}
                    className="ml-2 p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="x" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                
                <Text className="text-gray-700 text-sm leading-5" numberOfLines={3}>
                  {announcement.content}
                </Text>
              </View>
            </View>

            {/* Image */}
            {announcement.imageUrl && (
              <View className="px-4 pb-3">
                <Image 
                  source={{ uri: announcement.imageUrl }} 
                  className="w-full h-32 rounded-lg"
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Action Button and Footer */}
            <View className="px-4 pb-4">
              {announcement.actionButton && (
                <TouchableOpacity 
                  className="mb-3 py-3 px-4 rounded-lg items-center"
                  style={{ backgroundColor: getTypeColor(announcement.type) }}
                  onPress={onActionPress}
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-semibold">
                    {announcement.actionButton.text}
                  </Text>
                </TouchableOpacity>
              )}
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View 
                    className="px-2 py-1 rounded-full mr-2"
                    style={{ backgroundColor: `${getPriorityBorder(announcement.priority)}20` }}
                  >
                    <Text 
                      className="text-xs font-medium capitalize"
                      style={{ color: getPriorityBorder(announcement.priority) }}
                    >
                      {announcement.priority}
                    </Text>
                  </View>
                  <Text className="text-gray-500 text-xs">
                    {new Date(announcement.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
                
                <Text className="text-gray-400 text-xs">
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