import React, { useState, useEffect } from 'react';
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
import { useWebSocket } from '../../services/websocketService';
import { useToast } from '../../contexts/ToastContext';
import { RootState } from '../../store/store';
import { canSendMessage, getChannelPermissions } from '../../utils/channelPermissions';
import { FloatingAIButton } from '../../components/ai/FloatingAIButton';
import { AIChannelBot } from '../../components/ai/AIChannelBot';
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
  const { joinChannel, leaveChannel, isConnected, on } = useWebSocket();

  // Local state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showAIBot, setShowAIBot] = useState(false);

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
    loadMoreMessages,
    startTyping,
    stopTyping,
    canSendMessage: userCanSendMessage,
    currentChannel,
  } = useMessages(channelId);

  // Create a temporary channel object from route params for permission checking
  // This ensures permissions work immediately while currentChannel loads asynchronously
  const channelForPermissions = currentChannel || {
    id: channelId,
    name: channelName,
    members: (members || []).map(m => m.id || m.user_id).filter(Boolean),
    privacy_level: 'public', // Default to public if unknown
    created_by: null,
    owned_by: null,
    moderators: [],
    auto_join_roles: [],
  };

  // Check if current user can send messages using either loaded channel or route params
  const userCanSendMessages = canSendMessage(channelForPermissions, currentUser);
  
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
  const enhancedMembers = (
    actualChannelMembers.length > 0 ? actualChannelMembers : members || []
  ).map((member, index) => ({
    id: member?.id || member?.user_id || `member_${index}`,
    name: member?.name || member?.user_name || `User ${index + 1}`,
    username:
      member?.username ||
      member?.user_name ||
      member?.name ||
      `user${index + 1}`,
    role: member?.role || 'Member',
    avatar:
      member?.avatar ||
      member?.avatar_url || member?.name.split(' ')[0]?.charAt(0).toUpperCase() + member?.name.split(' ')[1]?.charAt(0).toUpperCase(),
    isOnline: member?.isOnline || true,
  }));

  // Message handlers
  const handleSendMessage = async (content: string, attachments?: any[]) => {
    try {
      const sentMessage = await sendMessage({
        content,
        type: 'text',
        replyTo: replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          sender: replyingTo.user_details ? {
            id: replyingTo.user_details.id, 
            name: replyingTo.user_details.name, 
            avatar: replyingTo.user_details.avatar_url, 
            role: replyingTo.user_details.role
          } : { name: 'Unknown User' },
        } : undefined,
        attachments,
      });
      
      console.log('✅ Message sent successfully:', {
        messageId: sentMessage?.id,
        hasReplyTo: !!sentMessage?.reply_to,
        replyToId: sentMessage?.reply_to_id,
        isReply: !!replyingTo
      });
      
      setReplyingTo(null);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      showError(err?.error?.message || err?.message || 'Failed to send message');
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await editMessage(messageId, content);
      setEditingMessage(null);
      showSuccess('Message updated!');
    } catch (err: any) {
      console.error('Failed to edit message:', err);
      showError(err?.error?.message || err?.message || 'Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      showSuccess('Message deleted!');
    } catch (err: any) {
      console.error('Failed to delete message:', err);
      showError(err?.error?.message || err?.message || 'Failed to delete message');
    }
  };



  // const handleGenerateSummary = () => {
  //   generateSummary();
  // };

  // const handleCreateTasks = () => {
  //   setShowTaskIntegration(true);
  // };

  const handleUserPress = (userId: string) => {
    // Navigate to user profile screen
    navigation.navigate('UserProfile', { userId });
  };

  // Join/leave channel room for websocket updates
  useEffect(() => {
    if (isConnected && channelId) {
      joinChannel(channelId);
      
      return () => {
        leaveChannel(channelId);
      };
    }
  }, [channelId, isConnected, joinChannel, leaveChannel]);

  // Handle channel deletion - navigate back if current channel is deleted
  useEffect(() => {
    if (!isConnected) return;
    
    const unsubscribeChannelDeleted = on('channel_deleted', (event: any) => {
      // Backend sends: { type, channelId, data: { type, channelId, userId, userName, userRole, timestamp }, timestamp }
      const deletedChannelId = event.channelId;
      
      if (deletedChannelId === channelId) {
        showError('This channel has been deleted');
        navigation.goBack();
      }
    });

    return () => {
      unsubscribeChannelDeleted();
    };
  }, [channelId, isConnected, navigation, showError, on]);


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
        {/* <AIActions
          onGenerateSummary={handleGenerateSummary}
          onCreateTasks={handleCreateTasks}
          isGeneratingSummary={isGeneratingSummary}
          isCreatingTasks={isCreatingTasks}
          messageCount={messages.length}
        /> */}

        {/* Messages */}
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          currentUser={currentUser}
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
          autoFocus={true}
          disabled={!userCanSendMessages}
          permissionMessage={
            !userCanSendMessages 
              ? `You do not have permission to send messages in this channel.`
              : undefined
          }
        />

        {/* AI Assistant Button */}
        <FloatingAIButton 
          onPress={() => setShowAIBot(true)}
          bottom={120}
          right={20}
        />

        {/* AI Channel Bot */}
        <AIChannelBot
          visible={showAIBot}
          onClose={() => setShowAIBot(false)}
          channelName={channelName}
          channelDescription={channelState.description}
          messages={messages}
        />
      </View>
    </KeyboardAvoidingView>
  );
};
