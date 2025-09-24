import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Message } from '../../components/messages/Message';
import { MessageInput } from '../../components/messages/MessageInput';
import { TypingIndicator } from '../../components/messages/TypingIndicator';
import { ThreadEmptyState } from '../../components/messages/ThreadEmptyState';
import { useMessages } from '../../hooks/useMessages';
import { useToast } from '../../contexts/ToastContext';
import { RootState } from '../../store/store';
import type { Message as MessageType } from '../../types/message';
import type { MainStackParamList } from '../../navigation/MainNavigator';

type ThreadScreenProps = NativeStackScreenProps<MainStackParamList, 'ThreadScreen'>;

export const ThreadScreen: React.FC<ThreadScreenProps> = ({
  navigation,
  route,
}) => {
  const { parentMessage, channelId, channelName } = route.params;
  const insets = useSafeAreaInsets();
  const { showError } = useToast();
  const flatListRef = useRef<FlatList>(null);
  
  // Get current user from auth state
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const currentUserId = currentUser?.id || 'unknown_user';

  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    loadMoreMessages,
    startTyping,
    stopTyping,
  } = useMessages(channelId, parentMessage.id);

  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageType | null>(null);

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToIndex({ index: 0, animated: true });
    }
  };

  const handleSendMessage = async (content: string, attachments?: any[]) => {
    try {
      await sendMessage({
        content,
        type: 'text',
        threadRootId: parentMessage.id,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          sender: replyingTo.sender,
        } : undefined,
        attachments,
      });
      setReplyingTo(null);
      scrollToBottom();
    } catch (error) {
      showError('Failed to send message');
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await editMessage(messageId, content);
      setEditingMessage(null);
    } catch (error) {
      showError('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
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

  const renderMessage = ({ item, index }: { item: MessageType; index: number }) => {
    // Safety check for null/undefined message
    if (!item || !item.timestamp) {
      return null;
    }

    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    const isGrouped = 
      nextMessage?.sender?.id === item.sender?.id &&
      nextMessage?.timestamp &&
      item.timestamp &&
      new Date(item.timestamp).getTime() - new Date(nextMessage.timestamp).getTime() < 300000; // 5 minutes

    return (
      <Message
        message={item}
        currentUserId={currentUserId}
        showAvatar={true}
        isGrouped={isGrouped}
        onReply={setReplyingTo}
        onEdit={setEditingMessage}
        onDelete={handleDeleteMessage}
        onReaction={handleReaction}
      />
    );
  };

  const renderHeader = () => (
    <View className="bg-white border-b border-gray-100">
      {/* Navigation Header */}
      <View 
        className="flex-row items-center justify-between px-4 py-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-9 h-9 bg-gray-50 rounded-full items-center justify-center mr-3"
          >
            <Feather name="arrow-left" size={18} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">Thread</Text>
            <Text className="text-sm text-gray-500">
              in #{channelName}
            </Text>
          </View>
        </View>
      </View>

      {/* Original Message */}
      <View className="px-4 pb-2">
        <Message
          message={parentMessage}
          currentUserId={currentUserId}
          showAvatar={true}
          isGrouped={false}
        />
      </View>

      {/* Thread Statistics */}
      <View className="px-4 pb-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <MaterialIcon name="forum" size={16} color="#3B82F6" />
          <Text className="ml-1 text-blue-700 font-medium text-sm">
            {messages.length} {messages.length === 1 ? 'reply' : 'replies'}
          </Text>
          {messages.length > 0 && (
            <>
              <Text className="mx-2 text-gray-400">•</Text>
              <Text className="text-gray-600 text-sm">
                {(() => {
                  const uniqueParticipants = new Set([
                    parentMessage.sender.id,
                    ...messages.map(msg => msg.sender.id)
                  ]);
                  return uniqueParticipants.size;
                })()} participants
              </Text>
            </>
          )}
        </View>
        {messages.length > 0 && (
          <Text className="text-gray-500 text-xs mt-1">
            Started by {parentMessage.sender.name}
          </Text>
        )}
      </View>
    </View>
  );

  const renderFooter = () => (
    <View className="p-4">
      {isLoadingMore && (
        <View className="items-center py-4">
          <MaterialIcon name="refresh" size={24} color="#6B7280" />
          <Text className="text-gray-500 text-sm mt-1">Loading more messages...</Text>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={0}
    >
      <View className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        {renderHeader()}

        {/* Messages List */}
        {messages.length === 0 && !isLoading ? (
          <ThreadEmptyState />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages.filter(msg => msg && msg.id)} // Filter out null/undefined messages
            renderItem={renderMessage}
            keyExtractor={(item, index) => item?.id || `message-${index}`} // Fallback key
            inverted
            showsVerticalScrollIndicator={false}
            onEndReached={hasMoreMessages ? loadMoreMessages : undefined}
            onEndReachedThreshold={0.1}
            ListFooterComponent={renderFooter}
            contentContainerStyle={{
              paddingTop: 16,
              paddingBottom: 8,
              flexGrow: messages.length === 0 ? 1 : undefined,
            }}
          />
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}

        {/* Reply Banner */}
        {replyingTo && (
          <View className="px-4 py-2 bg-blue-50 border-t border-blue-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-blue-700 font-medium text-sm">
                  Replying to {replyingTo.sender.name}
                </Text>
                <Text className="text-blue-600 text-sm" numberOfLines={1}>
                  {replyingTo.content}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                className="p-1"
              >
                <MaterialIcon name="close" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Edit Banner */}
        {editingMessage && (
          <View className="px-4 py-2 bg-orange-50 border-t border-orange-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-orange-700 font-medium text-sm">
                  Editing message
                </Text>
                <Text className="text-orange-600 text-sm" numberOfLines={1}>
                  {editingMessage.content}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditingMessage(null)}
                className="p-1"
              >
                <MaterialIcon name="close" size={20} color="#EA580C" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Message Input */}
        <MessageInput
          placeholder={`Reply to thread in #${channelName}...`}
          editingMessage={editingMessage}
          onSendMessage={handleSendMessage}
          onEditMessage={(content) => {
            if (editingMessage) {
              handleEditMessage(editingMessage.id, content);
            }
          }}
          onStartTyping={startTyping}
          onStopTyping={stopTyping}
          onCancelEdit={() => setEditingMessage(null)}
          autoFocus={true}
        />
      </View>
    </KeyboardAvoidingView>
  );
};