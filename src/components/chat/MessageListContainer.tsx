import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { ChatMessage } from './ChatMessage';
import type { Message } from '../../types/chat';

interface MessageListContainerProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  error: string | null;
  channelId: string;
  channelName: string;
  currentUserId: string;
  isConnected: boolean;
  isCEO?: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: { id: string; content: string }) => void;
  onDelete: (messageId: string) => void;
  onReaction: (messageId: string) => void;
}

export const MessageListContainer: React.FC<MessageListContainerProps> = ({
  messages,
  isLoading,
  isLoadingMore,
  hasMoreMessages,
  error,
  channelId,
  channelName,
  currentUserId,
  isConnected,
  isCEO = false,
  onLoadMore,
  onRetry,
  onReply,
  onEdit,
  onDelete,
  onReaction,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const previousMessageLength = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive or on initial load
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Auto-scroll to bottom if:
      // 1. Initial load (previousMessageLength was 0)
      // 2. New messages were added (length increased)
      const shouldScrollToBottom = 
        previousMessageLength.current === 0 || 
        messages.length > previousMessageLength.current;
      
      if (shouldScrollToBottom) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: messages.length > 1 });
        }, 100);
      }
      
      previousMessageLength.current = messages.length;
    }
  }, [messages.length]);

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage
      message={item}
      isOwnMessage={item.sender.id === currentUserId}
      currentUserId={currentUserId}
      isCEO={isCEO}
      onReply={() => onReply(item)}
      onEdit={() => onEdit({
        id: item.id,
        content: item.content
      })}
      onDelete={() => onDelete(item.id)}
      onShowEmojiPicker={() => onReaction(item.id)}
      onReaction={(emoji: string) => {
        // This would be handled by the parent component
        console.log(`Adding reaction ${emoji} to message ${item.id}`);
      }}
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

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-red-500 text-center mb-4">{error}</Text>
        <Text 
          className="text-blue-500 underline" 
          onPress={onRetry}
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
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 20, paddingTop: 10, paddingHorizontal: 0 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onRefresh={onLoadMore}
      refreshing={isLoadingMore}
      scrollEventThrottle={16}
      ListFooterComponent={
        hasMoreMessages && isLoadingMore ? (
          <View className="py-4 items-center">
            <Text className="text-gray-500">Loading more messages...</Text>
          </View>
        ) : hasMoreMessages ? (
          <View className="py-2 items-center">
            <Text className="text-gray-400 text-sm">Scroll up to load more messages</Text>
          </View>
        ) : null
      }
      onEndReached={hasMoreMessages ? onLoadMore : undefined}
      onEndReachedThreshold={0.1}
      ListEmptyComponent={() => (
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
            <Text className="text-2xl">💬</Text>
          </View>
          <Text className="text-gray-600 text-lg font-semibold mb-2">Start the discussion</Text>
          <Text className="text-gray-400 text-center leading-5">
            Share your thoughts and ideas in #{channelName}{'\n'}The AI assistant will help summarize and create tasks
          </Text>
          {__DEV__ && (
            <View className="mt-4 p-2 bg-gray-100 rounded">
              <Text className="text-xs text-gray-600">Debug Info:</Text>
              <Text className="text-xs text-gray-600">Channel: {channelId}</Text>
              <Text className="text-xs text-gray-600">Messages: {messages.length}</Text>
              <Text className="text-xs text-gray-600">Has More: {hasMoreMessages.toString()}</Text>
              <Text className="text-xs text-gray-600">WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</Text>
            </View>
          )}
        </View>
      )}
      getItemLayout={(_, index) => ({
        length: 80, // Estimated message height
        offset: 80 * index,
        index,
      })}
    />
  );
};

// Export ref for parent component to trigger scroll
export type MessageListRef = {
  scrollToBottom: () => void;
};

export const MessageListContainerWithRef = React.forwardRef<MessageListRef, MessageListContainerProps>(
  (props, ref) => {
    const flatListRef = useRef<FlatList>(null);
    
    React.useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    }));
    
    return <MessageListContainer {...props} />;
  }
);
