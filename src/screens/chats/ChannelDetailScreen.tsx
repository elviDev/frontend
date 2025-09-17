import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { ChannelHeader } from '../../components/chat/ChannelHeader';
import { ChannelActions } from '../../components/chat/ChannelActions';
import { MessageListContainer } from '../../components/chat/MessageListContainer';
import { ChannelInputContainer } from '../../components/chat/ChannelInputContainer';
import { ChannelModalsContainer } from '../../components/chat/ChannelModalsContainer';
import { useChannelState } from '../../hooks/useChannelState';
import { useMessageActions } from '../../hooks/useMessageActions';
import { useWebSocket } from '../../services/websocketService';
import { useToast } from '../../contexts/ToastContext';
import { RootState } from '../../store/store';
import type { Message } from '../../types/chat';
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
  const currentUserName = currentUser?.name || currentUser?.email || 'Unknown User';
  const currentUserAvatar = currentUser?.avatar_url;
  const isCEO = currentUser?.role === 'ceo';
  
  const { isConnected } = useWebSocket();
  const { showError, showSuccess, showInfo } = useToast();

  // Use custom hooks for state management
  const [channelState, channelActions] = useChannelState(channelId);
  
  const {
    // Message state
    messages,
    isLoadingMessages,
    isLoadingMoreMessages,
    hasMoreMessages,
    messageError,
    typingUsers,
    
    // Channel state
    channelStats,
    actualChannelMembers,
    isLoadingMembers,
    
    // Modal state
    showSummaryModal,
    showKeyPointsModal,
    showTaskIntegration,
    showEmojiPicker,
    channelSummary,
    isGeneratingSummary,
    isCreatingTasks,
    
    // Reply/Edit state
    replyingTo,
    editingMessage,
  } = channelState;

  const {
    // Actions
    loadMessages,
    loadMoreMessages,
    setReplyingTo,
    setEditingMessage,
    setShowSummaryModal,
    setShowKeyPointsModal,
    setShowTaskIntegration,
    setShowEmojiPicker,
    generateSummary,
  } = channelActions;

  // Use message actions hook with a wrapper that connects to addOptimisticMessage
  const addOptimisticMessageWrapper = (message: Omit<Message, 'id' | 'timestamp'>) => {
    // Add timestamp and pass to addOptimisticMessage
    const messageWithTimestamp = {
      ...message,
      timestamp: new Date(),
    };
    channelActions.addOptimisticMessage(messageWithTimestamp);
  };

  const {
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleReaction,
    handleSendVoiceMessage,
    handleAttachFile,
    handleStartTyping,
    handleStopTyping,
  } = useMessageActions(
    channelId,                    // 1
    currentUserId,                // 2
    currentUserName,              // 3
    currentUserAvatar,            // 4
    addOptimisticMessageWrapper,  // 5
    replyingTo,                   // 6
    editingMessage,               // 7
    setReplyingTo,                // 8
    setEditingMessage             // 9
  );

  // Enhanced members for UI consistency - use actual channel members if available
  const enhancedMembers = (actualChannelMembers.length > 0 ? actualChannelMembers : members || []).map((member, index) => ({
    id: member?.id || member?.user_id || `member_${index}`,
    name: member?.name || member?.user_name || `User ${index + 1}`,
    role: member?.role || 'Member',
    avatar: member?.avatar || member?.user_avatar || member?.name?.charAt(0) || member?.user_name?.charAt(0) || undefined,
    isOnline: member?.isOnline || true,
  }));

  // Transform enhanced members for mention functionality
  const mentionableMembers = enhancedMembers.map(member => ({
    id: member.id,
    name: member.name,
    username: member.name.toLowerCase().replace(/\s+/g, ''), // Convert name to username format
  }));

  // Message wrapper functions to handle different signatures
  const handleSendMessageWrapper = async (content: string) => {
    const isReply = !!replyingTo;
    const parentMessage = isReply ? messages.find(m => m.id === replyingTo.id) : null;
    
    try {
      await handleSendMessage(content, 'text');
      
      // If this was a reply and we successfully sent it, navigate to ThreadScreen
      if (isReply && parentMessage) {
        // Wait a moment for the message to be processed
        setTimeout(() => {
          navigation.navigate('ThreadScreen', {
            parentMessage: parentMessage,
            channelId,
            channelName,
            members: enhancedMembers,
            onUpdateMessage: (messageId: string, replies: any[]) => {
              console.log('Thread updated after navigation:', messageId, replies.length);
            },
          });
        }, 500); // Small delay to let the optimistic message appear
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleAttachFileWrapper = (file: any) => {
    if (file?.uri && file?.name) {
      handleAttachFile(file.uri, file.name);
    }
  };

  const handleAttachImageWrapper = (image: any) => {
    if (image?.uri && image?.name) {
      handleAttachFile(image.uri, image.name);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (showEmojiPicker) {
      handleReaction(showEmojiPicker, emoji);
      setShowEmojiPicker(null);
    }
  };

  const handleShareSummary = () => {
    showSuccess('Meeting summary shared with team');
    setShowSummaryModal(false);
  };

  const handleCreateTasksFromSummary = () => {
    showSuccess('Tasks created from action items');
    setShowSummaryModal(false);
  };

  const handleCreateTaskFromKeyPoints = (taskData: any) => {
    showSuccess(`Task "${taskData.title}" created`);
    setShowKeyPointsModal(false);
  };

  const handleGenerateSummary = () => {
    generateSummary();
    setShowSummaryModal(true);
  };

  const handleCreateTasks = () => {
    setShowTaskIntegration(true);
  };

  // Handle message deletion
  const handleDeleteMessageWrapper = async (messageId: string) => {
    try {
      await handleDeleteMessage(messageId);
      showSuccess('Message deleted successfully');
    } catch (error) {
      console.error('Failed to delete message:', error);
      showError('Failed to delete message');
    }
  };

  // Handle edit message with proper typing
  const handleEditMessageWrapper = (editData: { id: string; content: string }) => {
    setEditingMessage(editData);
  };

  // Handle actual message editing (called from input component)
  const handleEditMessageSubmit = async (messageId: string, content: string) => {
    try {
      await handleEditMessage(messageId, content);
      // Edit success is handled in useMessageActions
    } catch (error) {
      console.error('Failed to edit message:', error);
      showError('Failed to edit message');
    }
  };

  // Handle thread navigation and reply logic
  const handleReply = (message: Message) => {
    // If message already has replies, navigate to ThreadScreen
    if (message.replyCount && message.replyCount > 0) {
      navigation.navigate('ThreadScreen', {
        parentMessage: message,
        channelId,
        channelName,
        members: enhancedMembers,
        onUpdateMessage: (messageId: string, replies: any[]) => {
          // Update the parent message with updated reply count
          const updateMessage = (prevMessages: Message[]) => {
            return prevMessages.map(msg => 
              msg.id === messageId 
                ? { ...msg, replyCount: replies.length, lastReplyTimestamp: replies.length > 0 ? replies[replies.length - 1].timestamp : undefined }
                : msg
            );
          };
          // This would typically trigger a state update in the parent
          console.log('Thread updated from ThreadScreen:', messageId, replies.length);
        },
      });
    } else {
      // For new threads, set up reply state
      setReplyingTo({
        id: message.id,
        content: message.content,
        sender: message.sender.name,
        // For threading: this message becomes the threadRoot
        threadRoot: message.id,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        {/* Header */}
        <ChannelHeader
          channelName={channelName}
          members={enhancedMembers}
          messageCount={channelStats.messageCount}
          fileCount={channelStats.fileCount}
          onBack={() => navigation.goBack()}
          onMembersPress={() => {
            showInfo(`Channel has ${enhancedMembers.length} members${isLoadingMembers ? ' (loading...)' : ''}`);
          }}
          onStatsPress={() => {
            showInfo(`Channel has ${channelStats.messageCount} messages and ${channelStats.fileCount} files`);
          }}
        />

        {/* AI Actions */}
        <ChannelActions
          onGenerateSummary={handleGenerateSummary}
          onCreateTasks={handleCreateTasks}
          isGeneratingSummary={isGeneratingSummary}
          isCreatingTasks={isCreatingTasks}
        />

        {/* Messages */}
        <MessageListContainer
          messages={messages}
          isLoading={isLoadingMessages}
          isLoadingMore={isLoadingMoreMessages}
          hasMoreMessages={hasMoreMessages}
          error={messageError}
          channelId={channelId}
          channelName={channelName}
          currentUserId={currentUserId}
          isConnected={isConnected}
          isCEO={isCEO}
          onLoadMore={loadMoreMessages}
          onRetry={loadMessages}
          onReply={handleReply}
          onEdit={handleEditMessageWrapper}
          onDelete={handleDeleteMessageWrapper}
          onReaction={setShowEmojiPicker}
        />

        {/* Input */}
        <ChannelInputContainer
          channelName={channelName}
          typingUsers={typingUsers}
          currentUserId={currentUserId}
          channelMembers={mentionableMembers}
          replyingTo={replyingTo}
          editingMessage={editingMessage}
          onSendMessage={handleSendMessageWrapper}
          onEditMessage={handleEditMessageSubmit}
          onSendVoiceMessage={handleSendVoiceMessage}
          onAttachFile={handleAttachFileWrapper}
          onAttachImage={handleAttachImageWrapper}
          onStartTyping={handleStartTyping}
          onStopTyping={handleStopTyping}
          onCancelReply={() => setReplyingTo(null)}
          onCancelEdit={() => setEditingMessage(null)}
        />

        {/* Modals */}
        <ChannelModalsContainer
          showEmojiPicker={showEmojiPicker}
          onCloseEmojiPicker={() => setShowEmojiPicker(null)}
          onEmojiSelect={handleEmojiSelect}
          showSummaryModal={showSummaryModal}
          channelSummary={channelSummary}
          onCloseSummaryModal={() => setShowSummaryModal(false)}
          onShareSummary={handleShareSummary}
          onCreateTasksFromSummary={handleCreateTasksFromSummary}
          showKeyPointsModal={showKeyPointsModal}
          messages={messages}
          onCloseKeyPointsModal={() => setShowKeyPointsModal(false)}
          onCreateTaskFromKeyPoints={handleCreateTaskFromKeyPoints}
          showTaskIntegration={showTaskIntegration}
          channelId={channelId}
          channelName={channelName}
          memberIds={enhancedMembers.map(m => m.id)}
          onCloseTaskIntegration={() => setShowTaskIntegration(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
};
