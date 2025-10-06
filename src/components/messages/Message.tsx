import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { Avatar } from '../common/Avatar';
import { MessageAttachments } from './MessageAttachments';
import { ActionDialog } from '../common/ActionDialog';
import type { Message as MessageType } from '../../types/message';

interface MessageProps {
  message: MessageType;
  currentUserId: string;
  currentUser?: any;
  showAvatar?: boolean;
  isGrouped?: boolean;
  onReply?: (message: MessageType) => void;
  onEdit?: (message: MessageType) => void;
  onDelete?: (messageId: string) => void;
  onUserPress?: (userId: string) => void;
}

export const Message: React.FC<MessageProps> = ({
  message,
  currentUserId,
  currentUser,
  showAvatar = true,
  isGrouped = false,
  onReply,
  onEdit,
  onDelete,
  onUserPress,
}) => {
  // Always call hooks at the top, before any conditional logic
  const [showActions, setShowActions] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
  }
  
  // Extract user details - use current user only for own messages when missing
  const userDetails = message.user_details ? {
    id: message.user_details.id,
    name: message.user_details.name,
    avatar_url: message.user_details.avatar_url,
    role: message.user_details.role,
  } : {
    id: message.user_id || currentUser?.id || currentUserId,
    name: message.user_name || currentUser?.name || 'Unknown User',
    avatar_url: currentUser?.avatar_url,
    role: currentUser?.role,
  };
  const isOwnMessage = userDetails?.id === currentUserId;
  const isCEO = currentUser?.role === 'ceo';
  const canEdit = (isOwnMessage || isCEO) && !message.deleted_at;
  const canDelete = (isOwnMessage || isCEO) && !message.deleted_at;


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
        className={`${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}
      >
        {/* Avatar */}
        <View className={`w-10 ${isOwnMessage ? 'ml-3' : 'mr-3'}`}>
          {showAvatar ? (
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
        <View className={`${isOwnMessage ? 'max-w-[80%]' : 'flex-1'}`}>
          <View className={`${isOwnMessage ? 'bg-blue-500 rounded-2xl rounded-br-md px-4 py-2' : ''}`}>
          {/* Header */}
          {(
            <View className="flex-row items-center mb-1">
              <TouchableOpacity onPress={() => onUserPress?.(userDetails.id)}>
                <Text className={`font-semibold text-base ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
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
              <Text className={`ml-2 text-sm ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                {formatTime(new Date(message.created_at))}
              </Text>
              {message.is_edited && (
                <Text className="ml-1 text-gray-400 text-xs">
                  (edited)
                </Text>
              )}
            </View>
          )}

      

          {/* Message Text */}
          <View className="mb-1">
            <Text className={`text-base leading-5 ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
              {message.content}
            </Text>
          </View>

          {/* Attachments */}
          {message.attachments && Object.keys(message.attachments).length > 0 && (
            <MessageAttachments attachments={Object.values(message.attachments)} />
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
                    setShowDeleteDialog(true);
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
        </View>
      </Pressable>


      {/* Delete Confirmation Dialog */}
      <ActionDialog
        visible={showDeleteDialog}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        type="error"
        actions={[
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {},
          },
          {
            text: 'Delete',
            style: 'destructive',
            icon: 'delete',
            onPress: () => {
              onDelete?.(message.id);
            },
          },
        ]}
        onClose={() => setShowDeleteDialog(false)}
      />
    </Animated.View>
  );
};