import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';
import { EmptyState } from './EmptyState';
import type { Message as MessageType, TypingUser } from '../../types/message';

interface MessageListProps {
  messages: MessageType[];
  currentUserId: string;
  currentUser?: any;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  error?: string | null;
  typingUsers?: TypingUser[];
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onReply?: (message: MessageType) => void;
  onEdit?: (message: MessageType) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onUserPress?: (userId: string) => void;
  onScrollToBottom?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  currentUser,
  isLoading = false,
  isLoadingMore = false,
  hasMoreMessages = true,
  error = null,
  typingUsers = [],
  onRefresh,
  onLoadMore,
  onRetry,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onUserPress,
  onScrollToBottom,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollToBottomOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(scrollToBottomOpacity, {
      toValue: showScrollToBottom ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showScrollToBottom, scrollToBottomOpacity]);

  const formatDateSeparator = useCallback((date: Date): string => {
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM dd, yyyy');
    }
  }, []);

  const shouldShowDateSeparator = useCallback(
    (currentMessage: MessageType, previousMessage?: MessageType): boolean => {
      if (!previousMessage) return true;
      
      const currentDate = new Date(currentMessage.created_at);
      const previousDate = new Date(previousMessage.created_at);
      const shouldShow = !isSameDay(currentDate, previousDate);
      
      
      return shouldShow;
    },
    [],
  );

  const shouldGroupMessage = useCallback(
    (currentMessage: MessageType, previousMessage?: MessageType): boolean => {
      if (!previousMessage) return false;
      if (currentMessage?.user_id !== previousMessage?.user_id) return false;

      const timeDiff =
        new Date(previousMessage.created_at).getTime() -
        new Date(currentMessage.created_at).getTime();
      return timeDiff < 300000; // 5 minutes
    },
    [],
  );

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    setShowScrollToBottom(
      !isNearBottom && contentSize.height > layoutMeasurement.height + 200,
    );
  }, []);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messageThreads.mainMessages.length > 0) {
      flatListRef.current.scrollToIndex({
        index: messageThreads.mainMessages.length - 1,
        animated: true,
      });
      onScrollToBottom?.();
    }
  }, [ onScrollToBottom]);

  const renderDateSeparator = useCallback(
    (date: Date) => (
      <View className="items-center py-4">
        <View className="bg-gray-100 rounded-full px-3 py-1">
          <Text className="text-gray-600 text-sm font-medium">
            {formatDateSeparator(date)}
          </Text>
        </View>
      </View>
    ),
    [formatDateSeparator],
  );

  // Create a map of parent messages with their replies
  const messageThreads = useMemo(() => {
    const threads: { [key: string]: MessageType[] } = {};
    const mainMessages: MessageType[] = [];
    
    
    // First pass: identify main messages and create thread map
    messages.forEach(message => {
      if (message.reply_to_id) {
       
        if (!threads[message.reply_to_id]) {
          threads[message.reply_to_id] = [];
        }
        threads[message.reply_to_id].push(message);
      } else {
        // This is a main message
        mainMessages.push(message);
        if (!threads[message.id]) {
          threads[message.id] = [];
        }
      }
    });
    
    // Sort main messages by creation date (oldest first)
    mainMessages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    
    // Sort replies by creation date
    Object.keys(threads).forEach(threadId => {
      threads[threadId].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    
    return { threads, mainMessages };
  }, [messages]);

  const renderMessage = useCallback(
    ({ item, index }: { item: MessageType; index: number }) => {
      const previousMessage =
        index > 0 ? messageThreads.mainMessages[index - 1] : undefined;
      const isGrouped = shouldGroupMessage(item, previousMessage);
      const showDateSeparator = shouldShowDateSeparator(item, previousMessage);
      const replies = messageThreads.threads[item.id] || [];

      return (
        <View key={`message-container-${item.id}`}>
          {showDateSeparator && (
            <View key={`date-separator-${item.id}`}>
              {renderDateSeparator(new Date(item.created_at))}
            </View>
          )}
          
          {/* Main Message */}
          <Message
            key={`message-${item.id}`}
            message={item}
            currentUserId={currentUserId}
            currentUser={currentUser}
            showAvatar={true}
            isGrouped={isGrouped}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onReaction={onReaction}
            onUserPress={onUserPress}
          />
          
          {/* Reply Messages */}
          {replies.length > 0 && (
            <View style={{ 
              marginLeft: 60, 
              marginTop: 8, 
              paddingLeft: 12, 
              borderLeftWidth: 3, 
              borderLeftColor: '#E5E7EB',
              backgroundColor: '#F9FAFB',
              borderRadius: 8,
              paddingVertical: 4
            }}>
              {replies.map((reply, replyIndex) => (
                <View key={`reply-${reply.id}`} style={{ marginBottom: replyIndex === replies.length - 1 ? 0 : 8 }}>
                  <Message
                    message={reply}
                    currentUserId={currentUserId}
                    currentUser={currentUser}
                    showAvatar={true}
                    isGrouped={false}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onReaction={onReaction}
                    onUserPress={onUserPress}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      );
    },
    [
      messageThreads,
      shouldGroupMessage,
      shouldShowDateSeparator,
      renderDateSeparator,
      currentUserId,
      onReply,
      onEdit,
      onDelete,
      onReaction,
      onUserPress,
    ],
  );

  const renderHeader = useCallback(() => {
    if (!hasMoreMessages) {
      return (
        <View className="items-center py-6">
          <View className="bg-blue-50 rounded-full p-3 mb-3">
            <MaterialIcon name="chat" size={24} color="#3B82F6" />
          </View>
          <Text className="text-gray-900 font-semibold text-lg mb-1">
            This is the beginning
          </Text>
          <Text className="text-gray-500 text-center text-sm px-6">
            You're all caught up! This is the start of your conversation.
          </Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <View className="items-center py-6">
          <MaterialIcon name="refresh" size={24} color="#6B7280" />
          <Text className="text-gray-500 text-sm mt-2">
            Loading more messages...
          </Text>
        </View>
      );
    }

    return null;
  }, [hasMoreMessages, isLoadingMore]);

  const renderFooter = useCallback(() => {
    if (typingUsers.length > 0) {
      return <TypingIndicator users={typingUsers} />;
    }
    return <View className="h-2" />;
  }, [typingUsers]);

  const keyExtractor = useCallback((item: MessageType) => item.id, []);

  const getItemLayout = useMemo(
    () => (data: any, index: number) => ({
      length: 80, // Approximate message height
      offset: 80 * index,
      index,
    }),
    [],
  );

  const renderError = useCallback(
    () => (
      <View className="flex-1 items-center justify-center p-6">
        <View className="bg-red-50 rounded-full p-3 mb-4">
          <MaterialIcon name="error-outline" size={32} color="#EF4444" />
        </View>
        <Text className="text-gray-900 font-semibold text-lg mb-2">
          Something went wrong
        </Text>
        <Text className="text-gray-500 text-center mb-4">
          {error || 'Failed to load messages. Please try again.'}
        </Text>
        <TouchableOpacity
          onPress={onRetry}
          className="bg-blue-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-medium">Try Again</Text>
        </TouchableOpacity>
      </View>
    ),
    [error, onRetry],
  );

  // Show error state
  if (error && messages.length === 0) {
    return renderError();
  }

  // Show empty state
  if (messageThreads.mainMessages.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  return (
    <View className="flex-1 relative">
      <FlatList
        ref={flatListRef}
        data={messageThreads.mainMessages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        onEndReached={hasMoreMessages ? onLoadMore : undefined}
        onEndReachedThreshold={0.1}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        refreshControl={
          onRefresh && (
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          )
        }
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 8,
          flexGrow: messageThreads.mainMessages.length === 0 ? 1 : undefined,
        }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={20}
        windowSize={10}
        getItemLayout={getItemLayout}
      />

      {/* Scroll to Bottom Button */}
      <Animated.View
        style={{
          opacity: scrollToBottomOpacity,
          transform: [
            {
              translateY: scrollToBottomOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        }}
        className="absolute bottom-4 right-4"
        pointerEvents={showScrollToBottom ? 'auto' : 'none'}
      >
        <TouchableOpacity
          onPress={scrollToBottom}
          className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: '#3B82F6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <MaterialIcon name="keyboard-arrow-down" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};
