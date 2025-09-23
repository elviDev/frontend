import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PromptInput } from '../voice/PromptInput';
import type { Message } from '../../types/message';

interface MessageInputProps {
  placeholder?: string;
  editingMessage?: Message | null;
  replyingTo?: Message | null;
  onSendMessage: (content: string, attachments?: any[]) => void;
  onEditMessage?: (content: string) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  onCancelEdit?: () => void;
  onCancelReply?: () => void;
  onSendVoiceMessage?: (audioUri: string, transcript?: string) => void;
  onAttachFile?: (file: any) => void;
  onAttachImage?: (image: any) => void;
  channelMembers?: any[];
  isLoading?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  placeholder = 'Type a message...',
  editingMessage,
  replyingTo,
  onSendMessage,
  onEditMessage,
  onStartTyping,
  onStopTyping,
  onCancelEdit,
  onCancelReply,
  onSendVoiceMessage,
  onAttachFile,
  onAttachImage,
  channelMembers = [],
  isLoading = false,
}) => {
  const insets = useSafeAreaInsets();

  const handleSendMessage = (content: string) => {
    onSendMessage(content);
  };

  const handleEditMessage = (messageId: string, content: string) => {
    if (onEditMessage) {
      onEditMessage(content);
    }
  };

  return (
    <View 
      className="bg-white border-t border-gray-200"
      style={{ paddingBottom: insets.bottom }}
    >
      <PromptInput
        placeholder={placeholder}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        onStartTyping={onStartTyping}
        onStopTyping={onStopTyping}
        onSendVoiceMessage={onSendVoiceMessage}
        onAttachFile={onAttachFile}
        onAttachImage={onAttachImage}
        editingMessage={editingMessage ? {
          id: editingMessage.id,
          content: editingMessage.content
        } : null}
        replyingTo={replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          sender: replyingTo.sender.name
        } : null}
        onCancelEdit={onCancelEdit}
        onCancelReply={onCancelReply}
        channelMembers={channelMembers}
        isLoading={isLoading}
      />
    </View>
  );
};