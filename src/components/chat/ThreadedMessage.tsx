import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Avatar } from '../common/Avatar';
import type { Message } from '../../types/chat';

interface ThreadedMessageProps {
  message: Message;
  currentUserId?: string;
  isOwnMessage?: boolean;
  onReply: () => void;
  onReaction: (emoji: string) => void;
  onEdit?: () => void;
  onShowEmojiPicker?: () => void;
  onNavigateToUser?: (userId: string) => void;
  onNavigateToReference?: (type: string, id: string) => void;
  onOpenThread?: () => void;
}

export const ThreadedMessage: React.FC<ThreadedMessageProps> = ({
  message,
  currentUserId = 'current_user',
  isOwnMessage = false,
  onReply,
  onReaction,
  onEdit,
  onShowEmojiPicker,
  onNavigateToUser,
  onNavigateToReference,
  onOpenThread,
}) => {
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwn = message.sender.id === currentUserId;

  return (
    <View className={`mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
      <View className={`max-w-[85%] px-4 py-2 rounded-2xl ${
        isOwn 
          ? 'bg-blue-500 rounded-br-sm' 
          : 'bg-gray-200 rounded-bl-sm'
      }`}>
        {/* Message Header - only show for others' messages */}
        {!isOwn && (
          <View className="flex-row items-center mb-1">
            <Avatar
              user={{
                id: message.sender?.id || 'unknown',
                name: message.sender?.name || 'Unknown User',
                avatar: message.sender?.avatar,
                role: message.sender?.role,
                isOnline: true,
              }}
              size="xs"
              onPress={() => onNavigateToUser?.(message.sender.id)}
            />
            <Text className="font-medium text-gray-900 ml-2 text-sm">
              {message.sender.name}
            </Text>
          </View>
        )}

        {/* Message Content */}
        <Text className={`text-base ${isOwn ? 'text-white' : 'text-gray-800'}`}>
          {message.content}
        </Text>

        {/* Timestamp and edited indicator */}
        <View className="flex-row items-center justify-between mt-1">
          <Text className={`text-xs ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
            {formatTime(message.timestamp)}
            {message.isEdited && ' (edited)'}
          </Text>
        </View>

        {/* Thread indicator */}
        {message.replies && message.replies.length > 0 && (
          <TouchableOpacity 
            onPress={onOpenThread}
            className="flex-row items-center mt-2 pt-2 border-t border-opacity-20 border-gray-400"
          >
            <MaterialIcon 
              name="forum" 
              size={14} 
              color={isOwn ? '#DBEAFE' : '#8B5CF6'} 
            />
            <Text className={`text-xs ml-1 ${isOwn ? 'text-blue-200' : 'text-purple-600'}`}>
              {message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <View className="flex-row flex-wrap mt-1 px-2">
          {message.reactions.map((reaction, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => onReaction(reaction.emoji)}
              className="bg-white rounded-full px-2 py-1 mr-1 mb-1 border border-gray-200 shadow-sm"
            >
              <Text className="text-xs">
                {reaction.emoji} {reaction.count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};