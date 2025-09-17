import React from 'react';
import { PromptInput } from '../voice/PromptInput';
import { SimpleTypingIndicators } from './SimpleTypingIndicators';

interface ChannelMember {
  id: string;
  name: string;
  username: string;
}

interface ChannelInputContainerProps {
  channelName: string;
  typingUsers: Array<{
    userId: string;
    userName: string;
    isTyping: boolean;
    lastTypingTime?: number;
  }>;
  currentUserId: string;
  channelMembers?: ChannelMember[];
  replyingTo: { id: string; content: string; sender: string } | null;
  editingMessage: { id: string; content: string } | null;
  onSendMessage: (content: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onSendVoiceMessage: (audioUri: string, transcript?: string) => void;
  onAttachFile: (file: any) => void;
  onAttachImage: (image: any) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
}

export const ChannelInputContainer: React.FC<ChannelInputContainerProps> = ({
  channelName,
  typingUsers,
  currentUserId,
  channelMembers = [],
  replyingTo,
  editingMessage,
  onSendMessage,
  onEditMessage,
  onSendVoiceMessage,
  onAttachFile,
  onAttachImage,
  onStartTyping,
  onStopTyping,
  onCancelReply,
  onCancelEdit,
}) => {
  return (
    <>
      {/* Typing Indicators */}
      <SimpleTypingIndicators
        typingUsers={typingUsers}
        currentUserId={currentUserId}
      />

      {/* Voice-Enabled Chat Input */}
      <PromptInput
        onSendMessage={onSendMessage}
        onEditMessage={onEditMessage}
        onSendVoiceMessage={onSendVoiceMessage}
        onAttachFile={onAttachFile}
        onAttachImage={onAttachImage}
        onStartTyping={onStartTyping}
        onStopTyping={onStopTyping}
        placeholder={`Message #${channelName}`}
        channelMembers={channelMembers}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        editingMessage={editingMessage}
        onCancelEdit={onCancelEdit}
      />
    </>
  );
};
