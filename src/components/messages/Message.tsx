import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Pressable,
  Alert,
} from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { Avatar } from '../common/Avatar';
import { MessageReactions } from './MessageReactions';
import { MessageAttachments } from './MessageAttachments';
import { EmojiPicker } from './EmojiPicker';
import type { Message as MessageType } from '../../types/message';

interface MessageProps {
  message: MessageType;
  currentUserId: string;
  showAvatar?: boolean;
  isGrouped?: boolean;
  onReply?: (message: MessageType) => void;
  onEdit?: (message: MessageType) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
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
  onUserPress,
}) => {
  // Always call hooks at the top, before any conditional logic
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;
  
  // Early return for null/undefined messages
  if (!message) {
    return null;
  }
  
  // Early return for deleted messages BEFORE other state calculations
  if (message.deleted_at) {
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
  }``

  // Handle missing user_details gracefully
  const userDetails = {
    id: message.user_id,
    name: message.user_name || 'Unknown User',
    avatar_url: message.user_avatar || undefined,
    role: message.user_role || undefined,
  }
  const isOwnMessage = userDetails?.id === currentUserId;
  const canEdit = isOwnMessage && !message.deleted_at;
  const canDelete = isOwnMessage && !message.deleted_at;


  const formatTime = (timestamp: Date | null | undefined) => {
    if (!timestamp) {
      return 'Invalid time';
    }

    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

      // More comprehensive date validation
      if (isNaN(date.getTime()) || date.getTime() < 0) {
        return 'Invalid time';
      }

      // Additional validation for reasonable date ranges
      const now = new Date();
      const hundredYearsAgo = new Date(now.getFullYear() - 100, 0, 1);
      const hundredYearsFromNow = new Date(now.getFullYear() + 100, 0, 1);

      if (date < hundredYearsAgo || date > hundredYearsFromNow) {
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
    if (message.deleted_at) return;
    
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
            <TouchableOpacity onPress={() => onUserPress?.(userDetails.id)}>
              <Avatar
                user={{
                  id: userDetails.id,
                  name: userDetails.name,
                  avatar: userDetails.avatar_url || userDetails.name.charAt(0).toUpperCase()!,
                  role: userDetails.role,
                  isOnline: userDetails.id === currentUserId
                }}
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
              <TouchableOpacity onPress={() => onUserPress?.(userDetails.id)}>
                <Text className="font-semibold text-gray-900 text-base">
                  {userDetails.name}
                </Text>
              </TouchableOpacity>
              {userDetails.role && (
                <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded-full">
                  <Text className="text-blue-700 text-xs font-medium">
                    {userDetails.role}
                  </Text>
                </View>
              )}
              <Text className="ml-2 text-gray-500 text-sm">
                {formatTime(new Date(message.created_at))}
              </Text>
              {message.is_edited && (
                <Text className="ml-1 text-gray-400 text-xs">
                  (edited)
                </Text>
              )}
            </View>
          )}

          {/* Reply Reference */}
          {message.reply_to && (
            <View className="mb-2 pl-3 border-l-2 border-gray-300 bg-gray-50 rounded-r-lg p-2">
              <Text className="text-gray-600 text-xs font-medium">
                Replying to {message.reply_to.user_details?.name || message.reply_to.sender?.name || 'Someone'}
              </Text>
              <Text 
                className="text-gray-700 text-sm mt-0.5" 
                numberOfLines={2}
              >
                {message.reply_to.content}
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
          {message.attachments && Object.keys(message.attachments).length > 0 && (
            <MessageAttachments attachments={Object.values(message.attachments)} />
          )}


          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
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

              {/* React Button */}
              <TouchableOpacity
                onPress={() => {
                  setShowEmojiPicker(true);
                  setShowActions(false);
                }}
                className="flex-row items-center bg-yellow-100 px-3 py-2 rounded-full mr-2"
              >
                <Text className="text-yellow-600 text-base">😀</Text>
                <Text className="ml-1 text-yellow-600 text-sm font-medium">React</Text>
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

      {/* Emoji Picker Modal */}
      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={(emoji) => {
          try {
            onReaction?.(message.id, emoji);
          } catch (error) {
            console.error('Error calling onReaction:', error);
          }
        }}
      />
    </Animated.View>
  );
};