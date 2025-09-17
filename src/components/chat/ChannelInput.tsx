import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { PromptInput } from '../voice/PromptInput';

interface ChannelInputProps {
  onSendMessage: (text: string) => void;
  onSendVoiceMessage: (audioUri: string, transcript?: string) => void;
  onAttachFile: (file: any) => void;
  onAttachImage: (image: any) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  placeholder?: string;
  replyingTo?: {
    id: string;
    content: string;
    sender: string;
  } | null;
  onCancelReply?: () => void;
  editingMessage?: {
    id: string;
    content: string;
  } | null;
  onCancelEdit?: () => void;
}

export const ChannelInput: React.FC<ChannelInputProps> = ({
  onSendMessage,
  onSendVoiceMessage,
  onAttachFile,
  onAttachImage,
  onStartTyping,
  onStopTyping,
  placeholder = 'Message #channel',
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}) => {
  return (
    <View className="bg-white border-t border-gray-200">
      {/* Reply/Edit Preview */}
      {replyingTo && (
        <View className="flex-row items-center px-4 py-2 bg-blue-50 border-l-4 border-blue-400">
          <MaterialIcon name="reply" size={16} color="#3B82F6" />
          <View className="flex-1 ml-2">
            <Text className="text-blue-600 text-xs font-medium">
              Replying to {replyingTo.sender}
            </Text>
            <Text className="text-gray-600 text-sm" numberOfLines={1}>
              {replyingTo.content}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} className="p-1">
            <MaterialIcon name="close" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      {editingMessage && (
        <View className="flex-row items-center px-4 py-2 bg-orange-50 border-l-4 border-orange-400">
          <MaterialIcon name="edit" size={16} color="#F97316" />
          <View className="flex-1 ml-2">
            <Text className="text-orange-600 text-xs font-medium">
              Editing message
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelEdit} className="p-1">
            <MaterialIcon name="close" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Container */}
      <View className="px-2 py-1">
        <PromptInput
          onSendMessage={onSendMessage}
          onSendRecording={onSendVoiceMessage}
          onAttachFile={onAttachFile}
          onAttachImage={onAttachImage}
          onStartTyping={onStartTyping}
          onStopTyping={onStopTyping}
          placeholder={
            editingMessage
              ? 'Edit your message...'
              : replyingTo
                ? `Reply to ${replyingTo.sender}...`
                : placeholder
          }
          maxLines={4}
          disabled={false}
        />
      </View>
    </View>
  );
};
