import React, { useRef, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Animated } from 'react-native';
import { ChatMessage } from './ChatMessage';
import type { Message } from '../../types/chat';

interface ThreadedMessage extends Message {
  replies: ThreadedMessage[];
  isThreadExpanded?: boolean;
}

interface ThreadedMessageListProps {
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

export const ThreadedMessageList: React.FC<ThreadedMessageListProps> = ({
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
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Organize messages into threads
  const organizeMessagesIntoThreads = (messages: Message[]): ThreadedMessage[] => {
    const messageMap = new Map<string, ThreadedMessage>();
    const rootMessages: ThreadedMessage[] = [];

    console.log('🧵 Organizing messages into threads:', {
      totalMessages: messages.length,
      threadsExpanded: expandedThreads.size,
    });

    // First pass: create all messages and build map
    messages.forEach(msg => {
      const threadedMsg: ThreadedMessage = {
        ...msg,
        replies: [],
        isThreadExpanded: expandedThreads.has(msg.threadRoot || msg.id),
      };
      messageMap.set(msg.id, threadedMsg);
      
      // Log thread information for debugging
      if (msg.threadRoot || msg.connectedTo) {
        console.log('🧵 Thread message:', {
          id: msg.id,
          connectedTo: msg.connectedTo,
          threadRoot: msg.threadRoot,
          content: msg.content.substring(0, 30) + '...',
        });
      }
    });

    // Second pass: organize into threads
    messages.forEach(msg => {
      const threadedMsg = messageMap.get(msg.id)!;
      
      if (msg.connectedTo && msg.threadRoot) {
        // This is a reply - find the root message
        const rootMsg = messageMap.get(msg.threadRoot);
        if (rootMsg && rootMsg.id !== threadedMsg.id) { // Avoid self-reference
          rootMsg.replies.push(threadedMsg);
          rootMsg.replies.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          console.log('➡️ Added reply to thread:', {
            replyId: threadedMsg.id,
            rootId: rootMsg.id,
            totalReplies: rootMsg.replies.length,
          });
        } else {
          // Root message not found or is self-referencing, treat as standalone
          console.log('⚠️ Thread root not found or self-referencing, treating as standalone:', {
            messageId: msg.id,
            threadRoot: msg.threadRoot,
            connectedTo: msg.connectedTo,
          });
          rootMessages.push(threadedMsg);
        }
      } else {
        // This is a root message (or standalone message)
        rootMessages.push(threadedMsg);
      }
    });

    // Sort root messages by timestamp
    const sortedRoots = rootMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    console.log('✅ Thread organization complete:', {
      rootMessages: sortedRoots.length,
      messagesWithReplies: sortedRoots.filter(m => m.replies.length > 0).length,
      totalReplies: sortedRoots.reduce((sum, m) => sum + m.replies.length, 0),
    });

    return sortedRoots;
  };

  const threadedMessages = organizeMessagesIntoThreads(messages);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
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

  const toggleThread = (threadId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(threadId)) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
      }
      return newSet;
    });
  };

  const renderThreadHeader = (message: ThreadedMessage) => {
    if (message.replies.length === 0) return null;

    const threadId = message.threadRoot || message.id;
    const isExpanded = expandedThreads.has(threadId);
    const replyCount = message.replies.length;
    const lastReply = message.replies[message.replies.length - 1];

    return (
      <TouchableOpacity
        className="py-3 px-4 mx-2 mb-2 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg"
        onPress={() => toggleThread(threadId)}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700">
              💬 {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </Text>
            {lastReply && (
              <Text className="text-xs text-gray-500 mt-1">
                Last reply by {lastReply.sender.name} • {lastReply.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <Text className="text-xs text-blue-600 font-medium">
            {isExpanded ? '▼ Hide' : '▶ Show'} replies
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderReply = (reply: ThreadedMessage, index: number) => (
    <View key={reply.id} className="ml-6 mr-2 mb-1">
      <View className="bg-gray-50 rounded-lg border-l-3 border-gray-300 pl-3 pr-2 py-1">
        <ChatMessage
          message={reply}
          isOwnMessage={reply.sender.id === currentUserId}
          currentUserId={currentUserId}
          isCEO={isCEO}
          onReply={() => onReply(reply)}
          onEdit={() => onEdit({
            id: reply.id,
            content: reply.content
          })}
          onDelete={() => onDelete(reply.id)}
          onShowEmojiPicker={() => onReaction(reply.id)}
          onReaction={(emoji: string) => {
            console.log(`Adding reaction ${emoji} to reply ${reply.id}`);
          }}
          isThreadReply={true}
        />
      </View>
    </View>
  );

  const renderMessage = ({ item }: { item: ThreadedMessage }) => {
    const isExpanded = expandedThreads.has(item.threadRoot || item.id);
    
    return (
      <View className="mb-2">
        {/* Main message */}
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
            console.log(`Adding reaction ${emoji} to message ${item.id}`);
          }}
          hasReplies={item.replies.length > 0}
          replyCount={item.replies.length}
        />

        {/* Thread header */}
        {renderThreadHeader(item)}

        {/* Replies */}
        {isExpanded && item.replies.map((reply, index) => renderReply(reply, index))}
      </View>
    );
  };

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
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={onRetry}
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-orange-500 text-center mb-4">
          Connection lost. Messages may not be up to date.
        </Text>
        <Text className="text-gray-500 text-center">
          Reconnecting automatically...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        ref={flatListRef}
        data={threadedMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        onEndReached={hasMoreMessages ? onLoadMore : undefined}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          isLoadingMore ? (
            <View className="py-4 items-center">
              <Text className="text-gray-500">Loading more messages...</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{
          paddingVertical: 8,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </View>
  );
};
