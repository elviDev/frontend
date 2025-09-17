import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { PromptInput } from '../../components/voice/PromptInput';
import { SimpleTypingIndicators } from '../../components/chat/SimpleTypingIndicators';
import { useWebSocket, webSocketService } from '../../services/websocketService';
import { useToast } from '../../contexts/ToastContext';
import { messageService } from '../../services/api/messageService';
import type { Message } from '../../types/chat';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type ThreadScreenProps = NativeStackScreenProps<
  MainStackParamList,
  'ThreadScreen'
>;

export const ThreadScreen: React.FC<ThreadScreenProps> = ({
  navigation,
  route,
}) => {
  const { parentMessage, channelId, channelName, members, onUpdateMessage } = route.params;
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { isConnected, joinChannel, leaveChannel } = useWebSocket();
  const { showError, showSuccess } = useToast();

  // Transform members for mention functionality
  const mentionableMembers = (members || []).map(member => ({
    id: member.id,
    name: member.name,
    username: member.name.toLowerCase().replace(/\s+/g, ''), // Convert name to username format
  }));

  // State
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [currentUserId] = useState('current_user');
  const [typingUsers, setTypingUsers] = useState<Array<{
    userId: string;
    userName: string;
    isTyping: boolean;
  }>>([]);
  
  // Loading states
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [threadError, setThreadError] = useState<string | null>(null);
  
  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
  });

  // Load thread messages on mount
  useEffect(() => {
    loadThreadMessages();
    
    // Join channel for real-time updates
    if (isConnected) {
      joinChannel(channelId);
    }

    return () => {
      if (isConnected) {
        leaveChannel(channelId);
      }
    };
  }, [channelId, parentMessage.id, isConnected]);

  // WebSocket event listeners for real-time thread updates
  useEffect(() => {
    // Handle regular messages that might be thread replies  
    const handleMessageSent = (event: any) => {
      if (event.channelId === channelId && event.message) {
        // Check if this is a reply to our thread
        const threadRoot = parentMessage.threadRoot || parentMessage.id;
        if (event.message.thread_root === threadRoot || event.message.reply_to === parentMessage.id) {
          console.log('📨 New thread reply received (message_sent):', event);
          addThreadReply(event.message);
        }
      }
    };

    // Handle dedicated thread reply events
    const handleThreadReplySent = (event: any) => {
      if (event.channelId === channelId) {
        // Check if this is a reply to our thread
        const threadRoot = parentMessage.threadRoot || parentMessage.id;
        if (event.threadRoot === threadRoot || event.parentMessageId === parentMessage.id) {
          console.log('🧵 New thread reply received (thread_reply_sent):', event);
          addThreadReply(event.message);
        }
      }
    };

    const addThreadReply = (messageData: any) => {
      const newMessage: Message = {
        id: messageData.id,
        type: messageData.message_type || 'text',
        content: messageData.content,
        sender: {
          id: messageData.user_id,
          name: messageData.user_name || 'Unknown User',
          avatar: messageData.user_avatar,
          role: messageData.user_role || 'staff',
        },
        timestamp: new Date(messageData.created_at),
        reactions: messageData.reactions || [],
        replies: [],
        mentions: messageData.mentions || [],
        isEdited: messageData.is_edited || false,
        connectedTo: messageData.reply_to,
        threadRoot: messageData.thread_root,
      };

      setThreadMessages(prev => {
        // Check for duplicates
        if (prev.some(msg => msg.id === newMessage.id)) {
          console.log('⚠️ Thread reply already exists, skipping duplicate:', newMessage.id);
          return prev;
        }
        
        // Remove any optimistic messages that might match this real message
        const filteredMessages = prev.filter(msg => {
          if (!msg.isOptimistic) return true;
          
          // Check if this optimistic message matches the new real message
          const timeDiff = Math.abs(new Date(newMessage.timestamp).getTime() - new Date(msg.timestamp).getTime());
          const contentMatch = msg.content.trim().toLowerCase() === newMessage.content.trim().toLowerCase();
          const senderMatch = msg.sender.id === newMessage.sender.id;
          
          const isLikelyDuplicate = contentMatch && senderMatch && timeDiff < 30000;
          
          if (isLikelyDuplicate) {
            console.log('🔄 Removing optimistic thread reply replaced by real message:', msg.id, '→', newMessage.id);
          }
          
          return !isLikelyDuplicate;
        });
        
        const updated = [...filteredMessages, newMessage];
        const sorted = updated.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        console.log('✅ Thread reply added. Total replies:', sorted.length);
        return sorted;
      });

      // Auto-scroll to bottom for new replies
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    // Add event listeners
    webSocketService.on('message_sent', handleMessageSent);
    webSocketService.on('thread_reply_sent', handleThreadReplySent);

    return () => {
      webSocketService.off('message_sent', handleMessageSent);
      webSocketService.off('thread_reply_sent', handleThreadReplySent);
    };
  }, [channelId, parentMessage.id, parentMessage.threadRoot]);

  const loadThreadMessages = async (loadMore: boolean = false) => {
    if (loadMore && (!hasMoreMessages || isLoadingMore)) {
      return;
    }

    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoadingThread(true);
        setThreadError(null);
      }
      
      const currentOffset = loadMore ? pagination.offset + pagination.limit : 0;
      console.log('🧵 Loading thread messages:', { 
        parentMessageId: parentMessage.id,
        currentOffset,
        loadMore
      });
      
      const response = await messageService.getThreadMessages(channelId, parentMessage.id, {
        limit: pagination.limit,
        offset: currentOffset,
      });

      if (response.success) {
        const replies = response.data.replies;
        
        // Sort replies chronologically (oldest first)
        const sortedReplies = replies.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        if (loadMore) {
          setThreadMessages(prev => {
            const combined = [...prev, ...sortedReplies];
            // Remove duplicates
            const unique = combined.filter((msg, index, arr) => 
              arr.findIndex(m => m.id === msg.id) === index
            );
            return unique.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        } else {
          setThreadMessages(sortedReplies);
        }

        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          offset: currentOffset,
        }));
        
        setHasMoreMessages(response.data.pagination.hasMore);
        
        // Auto-scroll to bottom on initial load
        if (!loadMore) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }
      }
    } catch (error) {
      console.error('❌ Error loading thread messages:', error);
      setThreadError('Failed to load thread messages');
    } finally {
      setIsLoadingThread(false);
      setIsLoadingMore(false);
    }
  };

  const handleSendReply = async (text: string) => {
    if (!text.trim()) return;

    try {
      console.log('💬 Sending thread reply:', { text, parentMessage: parentMessage.id });
      
      // Add optimistic message immediately
      const optimisticMessage: Message = {
        id: `temp_thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'text',
        content: text.trim(),
        sender: {
          id: currentUserId,
          name: 'You', // TODO: Get actual current user name
          avatar: undefined,
          role: 'user',
        },
        timestamp: new Date(),
        reactions: [],
        replies: [],
        mentions: extractMentions(text),
        isEdited: false,
        connectedTo: parentMessage.id,
        threadRoot: parentMessage.threadRoot || parentMessage.id,
        isOptimistic: true,
      };

      setThreadMessages(prev => {
        const updated = [...prev, optimisticMessage];
        return updated.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

      // Auto-scroll to bottom for optimistic message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
      
      const response = await messageService.sendReply(channelId, parentMessage.id, {
        content: text,
        message_type: 'text',
        mentions: extractMentions(text),
      });

      if (response.success) {
        console.log('✅ Thread reply sent successfully');
        // WebSocket will handle replacing the optimistic message with the real one
        
        // Update parent message reply count
        if (onUpdateMessage) {
          onUpdateMessage(parentMessage.id, [...threadMessages, optimisticMessage]);
        }
      }
    } catch (error) {
      console.error('❌ Error sending thread reply:', error);
      showError('Failed to send reply. Please try again.');
      
      // Remove the failed optimistic message
      setThreadMessages(prev => 
        prev.filter(msg => !msg.isOptimistic || msg.content !== text.trim())
      );
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  const handleTypingChange = useCallback((users: Array<{
    userId: string;
    userName: string;
    isTyping: boolean;
  }>) => {
    setTypingUsers(users);
  }, []);

  const renderThreadMessage = ({ item, index }: { item: Message; index: number }) => (
    <View className="mx-4 mb-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
      <View className="px-4 py-3">
        <ChatMessage
          message={item}
          onReply={() => {}} // No nested threading for now
          onReaction={(emoji) => {
            // Handle reactions in thread
            console.log('Thread message reaction:', item.id, emoji);
          }}
          onEdit={item.sender.id === currentUserId ? () => {} : undefined}
          onShowEmojiPicker={() => {}}
          onNavigateToUser={() => {}}
          onNavigateToReference={() => {}}
          isOwnMessage={item.sender.id === currentUserId}
          isThreadReply={true}
          showThreadButton={false}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        {/* Modern Thread Header */}
        <View className="px-6 py-4 bg-white border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              className="w-9 h-9 items-center justify-center rounded-full bg-gray-50"
            >
              <MaterialIcon name="arrow-back" size={20} color="#374151" />
            </TouchableOpacity>
            <View className="flex-1 ml-4">
              <Text className="text-xl font-bold text-gray-900">Thread</Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                #{channelName}
              </Text>
            </View>
            <View className="bg-gray-100 px-3 py-1.5 rounded-full">
              <Text className="text-gray-600 text-xs font-medium">
                {threadMessages.length} {threadMessages.length === 1 ? 'reply' : 'replies'}
              </Text>
            </View>
          </View>
        </View>

        {/* Modern Parent Message */}
        <View className="bg-gray-50 mx-4 mt-4 rounded-2xl p-4 border border-gray-200">
          <View className="flex-row items-center mb-3">
            <View className="w-1 h-8 bg-blue-500 rounded-full mr-3" />
            <Text className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
              Original Message
            </Text>
          </View>
          <ChatMessage
            message={parentMessage}
            onReply={() => {}} // Disabled in thread view
            onReaction={() => {}}
            onShowEmojiPicker={() => {}}
            onNavigateToUser={() => {}}
            onNavigateToReference={() => {}}
            isOwnMessage={parentMessage.sender.id === currentUserId}
            showThreadButton={false}
            hideThreadInfo={true}
          />
        </View>

        {/* Thread Messages */}
        <View className="flex-1 pt-2">
          {isLoadingThread ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-gray-500">Loading thread...</Text>
            </View>
          ) : threadError ? (
            <View className="flex-1 items-center justify-center p-4">
              <Text className="text-red-500 text-center mb-4">{threadError}</Text>
              <TouchableOpacity 
                onPress={() => loadThreadMessages()}
                className="bg-blue-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={threadMessages}
              renderItem={renderThreadMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onRefresh={() => loadThreadMessages(true)}
              refreshing={isLoadingMore}
              ListEmptyComponent={() => (
                <View className="flex-1 items-center justify-center p-12">
                  <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                    <MaterialIcon name="chat-bubble-outline" size={28} color="#9CA3AF" />
                  </View>
                  <Text className="text-gray-600 text-lg font-medium mb-2">Start the conversation</Text>
                  <Text className="text-gray-400 text-center text-sm leading-5">
                    Be the first to reply to this message
                  </Text>
                </View>
              )}
              ListHeaderComponent={
                threadMessages.length > 0 ? (
                  <View className="px-6 py-4 mb-2">
                    <Text className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Replies ({threadMessages.length})
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>

        {/* Typing Indicators */}
        <SimpleTypingIndicators
          typingUsers={typingUsers}
          currentUserId={currentUserId}
        />

        {/* Thread Reply Input - Voice-Enabled */}
        <PromptInput
          onSendMessage={handleSendReply}
          onSendVoiceMessage={(audioUri, transcript) => {
            // Handle voice replies
            console.log('Voice reply:', { audioUri, transcript });
          }}
          onAttachFile={() => {
            // Handle file attachments in thread
            console.log('Attach file to thread');
          }}
          onAttachImage={() => {
            // Handle image attachments in thread
            console.log('Attach image to thread');
          }}
          placeholder={`Reply to ${parentMessage.sender.name}...`}
          channelMembers={mentionableMembers}
          replyingTo={null}
          editingMessage={null}
        />
      </View>
    </KeyboardAvoidingView>
  );
};