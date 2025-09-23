import React, { useState } from 'react';
import {
  View,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { ChannelHeader } from '../../components/chat/ChannelHeader';
import { AIActions } from '../../components/messages/AIActions';
import { MessageList } from '../../components/messages/MessageList';
import { MessageInput } from '../../components/messages/MessageInput';
import { useChannelState } from '../../hooks/useChannelState';
import { useMessages } from '../../hooks/useMessages';
import { useToast } from '../../contexts/ToastContext';
import { RootState } from '../../store/store';
import type { Message } from '../../types/message';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type ChannelDetailScreenProps = NativeStackScreenProps<MainStackParamList, 'ChannelDetailScreen'>;

export const ChannelDetailScreen: React.FC<ChannelDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { channelId, channelName, members } = route.params;
  
  const insets = useSafeAreaInsets();
  
  // Get current user from auth state
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const currentUserId = currentUser?.id || 'unknown_user';
  
  const { showError, showSuccess, showInfo } = useToast();

  // Local state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Use custom hooks for state management
  const [channelState, channelActions] = useChannelState(channelId);
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    error,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    loadMoreMessages,
    startTyping,
    stopTyping,
    createThread,
    updateThreadInfo,
  } = useMessages(channelId);
  
  const {
    // Channel state
    channelStats,
    actualChannelMembers,
    isLoadingMembers,
    // Modal state
    isGeneratingSummary,
    isCreatingTasks,
  } = channelState;
  
  const {
    // Actions
    setShowTaskIntegration,
    generateSummary,
  } = channelActions;


  // Enhanced members for UI consistency - use actual channel members if available
  const enhancedMembers = (actualChannelMembers.length > 0 ? actualChannelMembers : members || []).map((member, index) => ({
    id: member?.id || member?.user_id || `member_${index}`,
    name: member?.name || member?.user_name || `User ${index + 1}`,
    username: member?.username || member?.user_name || member?.name || `user${index + 1}`,
    role: member?.role || 'Member',
    avatar: member?.avatar || member?.user_avatar || member?.name?.charAt(0) || member?.user_name?.charAt(0) || undefined,
    isOnline: member?.isOnline || true,
  }));

  // Message handlers
  const handleSendMessage = async (content: string, attachments?: any[]) => {
    try {
      await sendMessage({
        content,
        type: 'text',
        replyTo: replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          sender: replyingTo.sender,
        } : undefined,
        attachments,
      });
      setReplyingTo(null);
    } catch (error) {
      showError('Failed to send message');
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await editMessage(messageId, content);
      setEditingMessage(null);
      showSuccess('Message updated!');
    } catch (error) {
      showError('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      showSuccess('Message deleted!');
    } catch (error) {
      showError('Failed to delete message');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      showError('Failed to add reaction');
    }
  };

  const handleThreadOpen = async (message: Message) => {
    // Mark the message as a thread root if it's not already
    if (!message.isThreadRoot) {
      await createThread(message.id);
    }
    
    navigation.navigate('ThreadScreen', {
      parentMessage: message,
      channelId,
      channelName,
    });
  };

  const handleGenerateSummary = () => {
    generateSummary();
  };

  const handleCreateTasks = () => {
    setShowTaskIntegration(true);
  };

  const handleUserPress = (userId: string) => {
    showInfo(`Navigate to user: ${userId}`);
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={0}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        {/* Header */}
        <ChannelHeader
          channelName={channelName}
          members={enhancedMembers}
          messageCount={messages.length}
          fileCount={channelStats.fileCount}
          onBack={() => navigation.goBack()}
          onMembersPress={() => {
            showInfo(`Channel has ${enhancedMembers.length} members${isLoadingMembers ? ' (loading...)' : ''}`);
          }}
          onStatsPress={() => {
            showInfo(`Channel has ${messages.length} messages and ${channelStats.fileCount} files`);
          }}
        />

        {/* AI Actions */}
        <AIActions
          onGenerateSummary={handleGenerateSummary}
          onCreateTasks={handleCreateTasks}
          isGeneratingSummary={isGeneratingSummary}
          isCreatingTasks={isCreatingTasks}
          messageCount={messages.length}
        />

        {/* Messages */}
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMoreMessages={hasMoreMessages}
          error={error}
          typingUsers={typingUsers}
          onRefresh={loadMoreMessages}
          onLoadMore={loadMoreMessages}
          onRetry={loadMoreMessages}
          onReply={setReplyingTo}
          onEdit={setEditingMessage}
          onDelete={handleDeleteMessage}
          onReaction={handleReaction}
          onThreadOpen={handleThreadOpen}
          onUserPress={handleUserPress}
        />

        {/* Message Input */}
        <MessageInput
          placeholder={`Message #${channelName}...`}
          editingMessage={editingMessage}
          replyingTo={replyingTo}
          onSendMessage={handleSendMessage}
          onEditMessage={(content) => {
            if (editingMessage) {
              handleEditMessage(editingMessage.id, content);
            }
          }}
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
          onCancelEdit={() => setEditingMessage(null)}
          onCancelReply={() => setReplyingTo(null)}
          onSendVoiceMessage={(audioUri: string, transcript?: string) => {
            console.log('Voice message:', audioUri, transcript);
            // TODO: Implement voice message handling
          }}
          onAttachFile={(file: any) => {
            console.log('File attached:', file);
            // TODO: Implement file attachment handling
          }}
          onAttachImage={(image: any) => {
            console.log('Image attached:', image);
            // TODO: Implement image attachment handling
          }}
          channelMembers={enhancedMembers}
          isLoading={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
};
