import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Pressable,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { Avatar } from '../common/Avatar';
import { MessageReactions } from './MessageReactions';
import { MessageAttachments } from './MessageAttachments';
import { ThreadPreview } from './ThreadPreview';
import type { Message, MessageContextMenuAction } from '../../types/message';

interface MessageProps {
  message: Message;
  currentUserId: string;
  showAvatar?: boolean;
  isGrouped?: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onThreadOpen?: (message: Message) => void;
  onUserPress?: (userId: string) => void;
}

export const Message: React.FC<MessageProps> = ({
  message,
  currentUserId,
  showAvatar = true,
  isGrouped = false,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onThreadOpen,
  onUserPress,
}) => {
  // Always call hooks at the top, before any conditional logic
  const [showActions, setShowActions] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;
  
  // Early return for null/undefined messages
  if (!message) {
    return null;
  }
  
  // Early return for deleted messages BEFORE other state calculations
  if (message.isDeleted) {
    return (
      <View className="px-4 py-2">
        <View className="flex-row items-center opacity-50">
          {showAvatar && !isGrouped && (
            <View className="w-10 h-10 mr-3" />
          )}
          <View className="flex-1">
            <Text className="text-gray-400 italic text-sm">
              This message was deleted
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const isOwnMessage = message.sender.id === currentUserId;
  const canEdit = isOwnMessage && !message.isDeleted;
  const canDelete = isOwnMessage && !message.isDeleted;

  // Get user information with proper fallback to user_details
  const getUserInfo = () => {
    // Prefer user_details from API, fallback to sender
    const userDetails = message.user_details || message.sender;
    return {
      id: userDetails.id,
      name: userDetails.name,
      email: userDetails.email,
      avatar: userDetails.avatar, // This should contain avatar_url from API
      role: userDetails.role,
      isOnline: userDetails.isOnline,
    };
  };

  const userInfo = getUserInfo();

  const formatTime = (timestamp: Date | null | undefined) => {
    if (!timestamp) {
      return 'Invalid time';
    }
    
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      
      if (isToday(date)) {
        return format(date, 'HH:mm');
      } else if (isYesterday(date)) {
        return `Yesterday ${format(date, 'HH:mm')}`;
      } else {
        return format(date, 'MMM dd, HH:mm');
      }
    } catch (error) {
      console.warn('Error formatting timestamp:', timestamp, error);
      return 'Invalid time';
    }
  };

  const handleLongPress = () => {
    if (message.isDeleted) return;
    
    // Show action buttons on the side instead of ActionSheet
    setShowActions(!showActions);
  };

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleReactionPress = (emoji: string) => {
    onReaction?.(message.id, emoji);
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleValue }] },
      ]}
      className="px-4 py-1"
    >
      <Pressable
        onLongPress={handleLongPress}
        onPress={() => {
          if (showActions) {
            setShowActions(false);
          }
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`flex-row ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
      >
        {/* Avatar */}
        <View className="w-10 mr-3">
          {showAvatar && !isGrouped ? (
            <TouchableOpacity onPress={() => onUserPress?.(userInfo.id)}>
              <Avatar
                user={userInfo}
                size="sm"
                showOnlineStatus={true}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Message Content */}
        <View className="flex-1">
          {/* Header */}
          {!isGrouped && (
            <View className="flex-row items-center mb-1">
              <TouchableOpacity onPress={() => onUserPress?.(userInfo.id)}>
                <Text className="font-semibold text-gray-900 text-base">
                  {userInfo.name}
                </Text>
              </TouchableOpacity>
              {userInfo.role && (
                <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded-full">
                  <Text className="text-blue-700 text-xs font-medium">
                    {userInfo.role}
                  </Text>
                </View>
              )}
              <Text className="ml-2 text-gray-500 text-sm">
                {formatTime(message.timestamp)}
              </Text>
              {message.isEdited && (
                <Text className="ml-1 text-gray-400 text-xs">
                  (edited)
                </Text>
              )}
            </View>
          )}

          {/* Reply Reference */}
          {message.replyTo && (
            <View className="mb-2 pl-3 border-l-2 border-gray-300 bg-gray-50 rounded-r-lg p-2">
              <Text className="text-gray-600 text-xs font-medium">
                Replying to {message.replyTo.sender.name}
              </Text>
              <Text 
                className="text-gray-700 text-sm mt-0.5" 
                numberOfLines={2}
              >
                {message.replyTo.content}
              </Text>
            </View>
          )}

          {/* Message Text */}
          <View className="mb-1">
            <Text className="text-gray-900 text-base leading-5">
              {message.content}
            </Text>
          </View>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <MessageAttachments attachments={message.attachments} />
          )}

          {/* Thread Preview */}
          {message.isThreadRoot && message.threadInfo && message.threadInfo.replyCount > 0 && (
            <ThreadPreview
              threadInfo={message.threadInfo}
              onPress={() => onThreadOpen?.(message)}
            />
          )}

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <MessageReactions
              reactions={message.reactions}
              onReactionPress={handleReactionPress}
              currentUserId={currentUserId}
            />
          )}

          {/* Action Buttons */}
          {showActions && (
            <View className="flex-row items-center mt-2 ml-2">
              {/* Reply Button */}
              <TouchableOpacity
                onPress={() => {
                  onReply?.(message);
                  setShowActions(false);
                }}
                className="flex-row items-center bg-blue-100 px-3 py-2 rounded-full mr-2"
              >
                <Feather name="corner-up-left" size={16} color="#3B82F6" />
                <Text className="ml-1 text-blue-600 text-sm font-medium">Reply</Text>
              </TouchableOpacity>

              {/* Edit Button (only for own messages) */}
              {canEdit && (
                <TouchableOpacity
                  onPress={() => {
                    onEdit?.(message);
                    setShowActions(false);
                  }}
                  className="flex-row items-center bg-orange-100 px-3 py-2 rounded-full mr-2"
                >
                  <MaterialIcon name="edit" size={16} color="#EA580C" />
                  <Text className="ml-1 text-orange-600 text-sm font-medium">Edit</Text>
                </TouchableOpacity>
              )}

              {/* Delete Button (only for own messages) */}
              {canDelete && (
                <TouchableOpacity
                  onPress={() => {
                    setShowActions(false);
                    Alert.alert(
                      'Delete Message',
                      'Are you sure you want to delete this message?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => onDelete?.(message.id),
                        },
                      ]
                    );
                  }}
                  className="flex-row items-center bg-red-100 px-3 py-2 rounded-full mr-2"
                >
                  <MaterialIcon name="delete" size={16} color="#EF4444" />
                  <Text className="ml-1 text-red-500 text-sm font-medium">Delete</Text>
                </TouchableOpacity>
              )}

              {/* Thread Button (only for non-thread messages) */}
              {!message.threadRootId && (
                <TouchableOpacity
                  onPress={() => {
                    onThreadOpen?.(message);
                    setShowActions(false);
                  }}
                  className="flex-row items-center bg-green-100 px-3 py-2 rounded-full mr-2"
                >
                  <MaterialIcon name="forum" size={16} color="#059669" />
                  <Text className="ml-1 text-green-600 text-sm font-medium">Thread</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Sending Status */}
          {message.isSending && (
            <View className="flex-row items-center mt-1">
              <MaterialIcon name="access-time" size={14} color="#9CA3AF" />
              <Text className="ml-1 text-gray-400 text-xs">Sending...</Text>
            </View>
          )}

          {message.sendError && (
            <View className="flex-row items-center mt-1">
              <MaterialIcon name="error" size={14} color="#EF4444" />
              <Text className="ml-1 text-red-500 text-xs">Failed to send</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};