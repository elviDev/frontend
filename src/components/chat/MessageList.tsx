import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { ChatMessage } from './ChatMessage';
import { TypingIndicators } from './TypingIndicators';
import type { Message } from '../../types/chat';

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  messageError: string | null;
  channelId: string;
  channelName: string;
  scrollPosition: number;
  typingUsers: Array<{
    userId: string;
    userName: string;
    isTyping: boolean;
  }>;
  flatListRef: React.RefObject<FlatList>;
  onRefresh: () => void;
  onScroll: (event: any) => void;
  onReply: (message: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onEdit: (message: Message) => void;
  onShowEmojiPicker: (messageId: string) => void;
  onNavigateToUser: (userId: string) => void;
  onNavigateToReference: (type: string, id: string) => void;
  onRetryLoadMessages: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId = 'current_user',
  isLoading,
  isLoadingMore,
  hasMoreMessages,
  messageError,
  channelId,
  channelName,
  scrollPosition,
  typingUsers,
  flatListRef,
  onRefresh,
  onScroll,
  onReply,
  onReaction,
  onEdit,
  onShowEmojiPicker,
  onNavigateToUser,
  onNavigateToReference,
  onRetryLoadMessages,
}) => {
  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage
      message={item}
      onReply={() => onReply(item)}
      onReaction={(emoji) => onReaction(item.id, emoji)}
      onEdit={item.sender.id === currentUserId ? () => onEdit(item) : undefined}
      onShowEmojiPicker={() => onShowEmojiPicker(item.id)}
      onNavigateToUser={onNavigateToUser}
      onNavigateToReference={onNavigateToReference}
      currentUserId={currentUserId}
      isOwnMessage={item.sender.id === currentUserId}
    />
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500 mb-2">Loading messages...</Text>
        {__DEV__ && (
          <Text className="text-xs text-gray-400 mt-2">Channel: {channelId}</Text>
        )}
      </View>
    );
  }

  if (messageError) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-red-500 text-center mb-4">{messageError}</Text>
        <Text 
          className="text-blue-500 underline" 
          onPress={onRetryLoadMessages}
        >
          Tap to retry
        </Text>
        {__DEV__ && (
          <Text className="text-xs text-gray-400 mt-4">Channel: {channelId}</Text>
        )}
      </View>
    );
  }

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onRefresh={onRefresh}
        refreshing={isLoadingMore}
        onScroll={onScroll}
        scrollEventThrottle={16}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        ListHeaderComponent={
          hasMoreMessages && isLoadingMore ? (
            <View className="py-4 items-center">
              <Text className="text-gray-500">Loading more messages...</Text>
            </View>
          ) : hasMoreMessages ? (
            <View className="py-2 items-center">
              <Text className="text-gray-400 text-sm">Pull down to load more messages</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center p-8">
            <Text className="text-gray-500 text-lg mb-2">No messages yet</Text>
            <Text className="text-gray-400 text-center">
              Be the first to send a message in #{channelName}
            </Text>
            {__DEV__ && (
              <View className="mt-4 p-2 bg-gray-100 rounded">
                <Text className="text-xs text-gray-600">Debug Info:</Text>
                <Text className="text-xs text-gray-600">Channel: {channelId}</Text>
                <Text className="text-xs text-gray-600">Messages: {messages.length}</Text>
                <Text className="text-xs text-gray-600">Has More: {hasMoreMessages.toString()}</Text>
              </View>
            )}
          </View>
        )}
      />
      
      {/* Typing Indicators at bottom of message list */}
      <TypingIndicators 
        typingUsers={typingUsers.filter(user => user.isTyping && user.userId !== currentUserId)}
      />
    </>
  );
};