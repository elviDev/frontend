import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useToast } from '../contexts/ToastContext';
import { RootState } from '../store/store';
import type { Message, TypingUser, MessagesResponse } from '../types/message';
import { messageService } from '../services/messageService';
import { webSocketService } from '../services/websocketService';
import { channelService } from '../services/api/channelService';
import { canSendMessage, getMessageSendDeniedReason } from '../utils/channelPermissions';
import type { Channel } from '../services/api/channelService';

interface SendMessageParams {
  content: string;
  type: 'text' | 'image' | 'file' | 'voice';
  replyTo?: {
    id: string;
    content: string;
    sender: any;
  };
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size?: number;
  }>;
}

interface WebSocketMessageEvent {
  channelId?: string;
  channel_id?: string;
  message?: Message;
  data?: Message;
}

interface WebSocketReactionEvent {
  messageId: string;
  currentReactions: Array<{
    emoji: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
      email?: string;
      avatar_url?: string;
    }>;
  }>;
}

interface WebSocketTypingEvent {
  channelId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  user?: {
    name: string;
    avatar_url?: string;
  };
  isTyping: boolean;
}

export const useMessages = (channelId: string) => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const { showError, showSuccess } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);

  // Production-grade state management
  const [editingMessages, setEditingMessages] = useState<Set<string>>(
    new Set(),
  );
  const [deletingMessages, setDeletingMessages] = useState<Set<string>>(
    new Set(),
  );
  const [messageIds, setMessageIds] = useState<Set<string>>(new Set());

  // Enhanced pagination state with proper cursor-based pagination
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    total: 0,
    hasMore: true,
    nextCursor: null as string | null,
    isInitialLoad: true,
  });

  // Simplified message normalization - preserve original author info when possible
  const normalizeMessage = useCallback((msg: Message): Message => {
    // Only add user_details if completely missing - don't overwrite existing ones
    if (!msg.user_details) {
      console.warn(`Message ${msg.id} missing user_details, using fallback`);
    }
    
    return {
      ...msg,
      reactions: msg.reactions || [],
      attachments: msg.attachments || [],
      mentions: msg.mentions || [],
      user_details: msg.user_details || {
        id: msg.user_id || 'unknown_user',
        name: 'Unknown User',
        avatar_url: undefined,
        role: undefined,
      },
    };
  }, []);

  // Message state updater with ID-based deduplication
  const updateMessages = useCallback(
    (updater: (prev: Message[]) => Message[]) => {
      setMessages(prev => {
        const updated = updater(prev);
        const normalized = updated.map(normalizeMessage);

        // Filter out messages with duplicate IDs
        const deduplicatedMessages: Message[] = [];
        const seenIds = new Set<string>();

        normalized.forEach(msg => {
          if (msg && msg.id && !seenIds.has(msg.id)) {
            seenIds.add(msg.id);
            deduplicatedMessages.push(msg);
          }
        });

        // Update the messageIds Set
        setMessageIds(seenIds);

        return deduplicatedMessages;
      });
    },
    [normalizeMessage],
  );

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadedRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const loadMessagesRef = useRef<(() => Promise<void>) | null>(null);
  const pendingRequestsRef = useRef<Set<string>>(new Set());
  const lastTypingTimestampRef = useRef<number>(0);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // No transformation needed - use backend data directly

  const loadMessages = useCallback(async () => {
    const loadKey = `${channelId}-channel`;

    // Cancel any existing load operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check if already loaded or component unmounted
    if (loadedRef.current === loadKey || !isMountedRef.current) {
      return;
    }

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setError(null);

    try {
      const response = await messageService.getChannelMessages(channelId, {
        limit: 50,
        offset: 0,
      });

      // Check if operation was aborted
      if (signal.aborted || !isMountedRef.current) return;

      if (
        response.success ||
        (response.data !== undefined && response.data !== null)
      ) {
        // Handle empty messages array gracefully
        const messagesArray = Array.isArray(response.data) ? response.data : [];
        // Double-check component is still mounted before updating state
        if (isMountedRef.current) {
          // Sort messages by timestamp (oldest first)
          const sortedMessages = messagesArray.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );
          setMessages(sortedMessages);
          const paginationData = response.pagination || {
            hasMore: false,
            has_more: false,
            total: 0,
            next_cursor: null,
            nextCursor: null,
          };
          setHasMoreMessages(
            paginationData.hasMore || paginationData.has_more || false,
          );

          // Initialize pagination state for channel
          setPagination({
            offset: sortedMessages.length,
            limit: 20,
            total: paginationData.total || 0,
            hasMore: paginationData.hasMore || paginationData.has_more || false,
            nextCursor:
              (paginationData as any).next_cursor ||
              (paginationData as any).nextCursor ||
              null,
            isInitialLoad: false,
          });

          loadedRef.current = loadKey;
        }
      } else {
        if (isMountedRef.current) {
          // Don't show error for empty results, just show empty state
          setMessages([]);
          setHasMoreMessages(false);
          setPagination({
            offset: 0,
            limit: 20,
            total: 0,
            hasMore: false,
            nextCursor: null,
            isInitialLoad: false,
          });
          loadedRef.current = loadKey;
        }
      }
    } catch (err: any) {
      console.error('Load messages error:', err.message || err);

      // Check if this is a "not found" or "no content" type error
      const isEmptyResult =
        err.error?.statusCode === 404 ||
        err.error?.statusCode === 204 ||
        err.error?.message?.toLowerCase().includes('not found') ||
        err.error?.message?.toLowerCase().includes('no messages') ||
        err.error?.message?.toLowerCase().includes('no replies');

      if (isEmptyResult && isMountedRef.current && !signal.aborted) {
        // Handle empty state gracefully without showing an error
        setMessages([]);
        setHasMoreMessages(false);
        setPagination({
          offset: 0,
          limit: 20,
          total: 0,
          hasMore: false,
          nextCursor: null,
          isInitialLoad: false,
        });
        loadedRef.current = loadKey;
        return;
      }

      // More detailed error handling for actual errors
      let errorMessage = 'Failed to load messages';
      if (
        err.name === 'TypeError' &&
        err.message.includes('Network request failed')
      ) {
        errorMessage =
          'Network connection failed. Please check your internet connection or try again later.';
      } else if (
        err.message?.includes('fetch') ||
        err.message?.includes('network')
      ) {
        errorMessage =
          'Connection error. Please check your internet connection and try again.';
      } else if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      // Only set error if component is still mounted and operation wasn't aborted
      if (isMountedRef.current && !signal.aborted) {
        setError(errorMessage);
      }
    } finally {
      // Only update loading state if component is still mounted and operation wasn't aborted
      if (isMountedRef.current && !signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [channelId]);

  // Store loadMessages in ref for stable reference in useEffect
  loadMessagesRef.current = loadMessages;

  // Load channel information for permission checking
  const loadChannel = useCallback(async () => {
    try {
      const channel = await channelService.getChannel(channelId);
      if (isMountedRef.current) {
        setCurrentChannel(channel);
      }
    } catch (error) {
      console.error('Failed to load channel info for permissions:', error);
      // Don't show error to user as this is for permission checking
    }
  }, [channelId]);

  // Enhanced load more with intelligent pagination and caching
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || !pagination.hasMore) {
      return;
    }

    // Enhanced request deduplication with pagination state
    const requestKey = `loadMore-${channelId}-channel-${pagination.offset}-${pagination.nextCursor || 'none'}`;
    if (pendingRequestsRef.current.has(requestKey)) {
      return;
    }

    pendingRequestsRef.current.add(requestKey);
    setIsLoadingMore(true);

    try {
      const requestOptions = {
        limit: pagination.limit,
        offset: pagination.offset,
        ...(pagination.nextCursor && { cursor: pagination.nextCursor }),
      };

      // Load more channel messages
      const response = await messageService.getChannelMessages(
        channelId,
        requestOptions,
      );

      if (response.success && isMountedRef.current) {
        // Handle empty messages array gracefully
        const messagesArray = Array.isArray(response.data) ? response.data : [];

        // Smart message merging to prevent duplicates
        updateMessages(prev => [...prev, ...messagesArray]);

        // Update pagination state
        const paginationData = response.pagination || {
          hasMore: false,
          has_more: false,
          total: 0,
          next_cursor: null,
          nextCursor: null,
        };
        setPagination(prev => ({
          ...prev,
          offset: prev.offset + messagesArray.length,
          hasMore: paginationData.hasMore || paginationData.has_more || false,
          nextCursor:
            (paginationData as any).next_cursor ||
            (paginationData as any).nextCursor ||
            null,
          total: paginationData.total || prev.total,
        }));

        setHasMoreMessages(
          paginationData.hasMore || paginationData.has_more || false,
        );
      }
    } catch (err: any) {
      console.error('Failed to load more messages:', err.message || err);

      if (isMountedRef.current) {
        // Check if this is a "not found" or "no content" type error
        const isEmptyResult =
          err.error?.statusCode === 404 ||
          err.error?.statusCode === 204 ||
          err.error?.message?.toLowerCase().includes('not found') ||
          err.error?.message?.toLowerCase().includes('no messages') ||
          err.error?.message?.toLowerCase().includes('no replies');

        if (isEmptyResult) {
          // Handle empty state gracefully without showing an error
          setHasMoreMessages(false);
          setPagination(prev => ({ ...prev, hasMore: false }));
          return;
        }

        // Enhanced error handling with retry capability for actual errors
        const errorMessage =
          err.error?.message || err.message || 'Failed to load more messages';

        if (
          err.name === 'TypeError' &&
          err.message.includes('Network request failed')
        ) {
          showError(
            'Network error. Please check your connection and try again.',
          );
        } else if (err.error?.statusCode === 429) {
          showError('Too many requests. Please wait a moment and try again.');
        } else {
          showError(errorMessage);
        }
      }
    } finally {
      pendingRequestsRef.current.delete(requestKey);
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [
    isLoadingMore,
    hasMoreMessages,
    pagination,
    channelId,
    messages.length,
    showError,
    updateMessages,
  ]);

  const sendMessage = useCallback(
    async (
      params: SendMessageParams,
      retryCount = 0,
    ): Promise<Message | undefined> => {
      try {
        // Check permissions before sending
        if (!canSendMessage(currentChannel, currentUser)) {
          const reason = getMessageSendDeniedReason(currentChannel, currentUser);
          showError(reason || 'You do not have permission to send messages in this channel');
          throw new Error(reason || 'Permission denied');
        }

        // Send message directly without optimistic updates
        const response = await messageService.sendMessage(channelId, {
          content: params.content,
          message_type:
            params.type === 'image'
              ? 'file'
              : (params.type as 'text' | 'voice' | 'file' | 'system'),
          reply_to_id: params.replyTo?.id,
          attachments: params.attachments?.map(att => ({
            file_id: att.id,
            filename: att.name,
            file_type: att.type,
            file_size: att.size || 0,
          })),
        });

        if (response.success) {
          console.log('✅ Message sent to server successfully. Waiting for WebSocket confirmation:', {
            messageId: response.data?.id,
            content: response.data?.content,
            hasCompleteData: !!(response.data?.reply_to),
            replyToId: response.data?.reply_to_id
          });
          
          // Show success but don't update UI - let WebSocket handle that
          showSuccess('Message sent!');
          
          // Return the API response but UI will update only via WebSocket
          return response.data as Message;
        } else {
          throw new Error(
            (response as any).error?.message || 'Failed to send message',
          );
        }
      } catch (err: any) {
        console.error('❌ Failed to send message:', err);

        // Enhanced error handling with retry capability
        const shouldRetry =
          retryCount < 2 &&
          ((err.name === 'TypeError' &&
            err.message.includes('Network request failed')) ||
            err.error?.statusCode >= 500);

        if (shouldRetry) {
          // Wait before retry with exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000),
          );
          return sendMessage(params, retryCount + 1);
        }

        const errorMessage =
          err.error?.message || err.message || 'Failed to send message';
        showError(`Failed to send message: ${errorMessage}`);

        throw err;
      }
    },
    [showSuccess, showError, channelId, currentChannel, currentUser],
  );

  const editMessage = useCallback(
    async (
      messageId: string,
      content: string,
      retryCount = 0,
    ): Promise<void> => {
      const originalMessage = messages.find(m => m.id === messageId);
      if (!originalMessage) {
        return;
      }

      // Prevent editing if already being edited
      if (editingMessages.has(messageId)) {
        return;
      }

      // Mark as being edited
      setEditingMessages(prev => new Set([...Array.from(prev), messageId]));
      try {
        const response = await messageService.editMessage(
          channelId,
          messageId,
          { content }
        );

        if (response.success && response.data) {
          // Update with real data from API (no transformation needed)
          const updatedMessage = response.data as Message;
          const finalMessage = {
            ...updatedMessage,
            isBeingEdited: false,
          };

          console.log('🔄 Edit response received:', {
            messageId: updatedMessage.id,
            hasReplyTo: !!updatedMessage.reply_to,
            replyToId: updatedMessage.reply_to_id,
            content: updatedMessage.content
          });

          updateMessages(prev =>
            prev.map(msg => {
              if (msg.id === messageId) {
                // Preserve original author details when editing
                return {
                  ...finalMessage,
                  user_details: finalMessage.user_details || msg.user_details,
                  user_id: finalMessage.user_id || msg.user_id,
                };
              }
              return msg;
            }),
          );

          showSuccess('Message updated!');
        } else {
          throw new Error(
            (response as any).error?.message || 'Failed to edit message',
          );
        }
      } catch (err: any) {
        console.error('❌ Failed to edit message:', err);

        // Enhanced error handling with retry capability
        const shouldRetry =
          retryCount < 2 &&
          ((err.name === 'TypeError' &&
            err.message.includes('Network request failed')) ||
            err.error?.statusCode >= 500);

        if (shouldRetry) {
          // Wait before retry with exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000),
          );

          return editMessage(messageId, content, retryCount + 1);
        }

        // Revert to original message on final failure
        updateMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...originalMessage, isBeingEdited: false }
              : msg,
          ),
        );

        const errorMessage =
          err.error?.message || err.message || 'Failed to edit message';
        showError(`Failed to edit message: ${errorMessage}`);

        throw err;
      } finally {
        // Remove from editing set
        setEditingMessages(prev => {
          const updated = new Set(prev);
          updated.delete(messageId);
          return updated;
        });
      }
    },
    [messages, editingMessages, updateMessages, showSuccess, showError],
  );

  const deleteMessage = useCallback(
    async (messageId: string, retryCount = 0): Promise<void> => {
      const originalMessage = messages.find(m => m.id === messageId);
      if (!originalMessage) {
        return;
      }

      // Prevent deleting if already being deleted
      if (deletingMessages.has(messageId)) {
        return;
      }

      // Mark as being deleted
      setDeletingMessages(prev => new Set([...Array.from(prev), messageId]));

      try {
        const response = await messageService.deleteMessage(
          channelId,
          messageId,
        );
        console.log('Delete message response:', response);
        if (response.success) {
          // Remove message from list completely on successful delete
          updateMessages(prev => prev.filter(msg => msg.id !== messageId));

          showSuccess('Message deleted!');
        } else {
          throw new Error(
            (response as any).error?.message || 'Failed to delete message',
          );
        }
      } catch (err: any) {
        console.error('❌ Failed to delete message:', err);

        // Enhanced error handling with retry capability
        const shouldRetry =
          retryCount < 2 &&
          ((err.name === 'TypeError' &&
            err.message.includes('Network request failed')) ||
            err.error?.statusCode >= 500);

        if (shouldRetry) {
          // Wait before retry with exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000),
          );

          return deleteMessage(messageId, retryCount + 1);
        }

        // Revert to original message on final failure
        updateMessages(prev =>
          prev.map(msg =>
            msg.id === messageId
              ? { ...originalMessage, isBeingDeleted: false }
              : msg,
          ),
        );

        const errorMessage =
          err.error?.message || err.message || 'Failed to delete message';
        showError(`Failed to delete message: ${errorMessage}`);

        throw err;
      } finally {
        // Remove from deleting set
        setDeletingMessages(prev => {
          const updated = new Set(prev);
          updated.delete(messageId);
          return updated;
        });
      }
    },
    [messages, deletingMessages, updateMessages, showSuccess, showError],
  );


  // Enhanced typing indicators with debouncing and proper cleanup
  const startTyping = useCallback(() => {
    const now = Date.now();

    // Debounce typing events - only send if last typing was more than 1 second ago
    if (now - lastTypingTimestampRef.current < 1000) {
      return;
    }

    lastTypingTimestampRef.current = now;
    webSocketService.startTyping(channelId, 'channel');

    // Clear existing timeout
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingDebounceRef.current = setTimeout(() => {
      webSocketService.stopTyping(channelId, 'channel');
    }, 3000);
  }, [channelId]);

  const stopTyping = useCallback(() => {
    webSocketService.stopTyping(channelId, 'channel');

    // Clear all typing-related timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }

    lastTypingTimestampRef.current = 0;
  }, [channelId]);

  // Send thread reply
  const sendThreadReply = useCallback(
    async (parentMessageId: string, content: string): Promise<void> => {
      try {
        const response = await messageService.sendThreadReply(channelId, parentMessageId, {
          content,
          message_type: 'text',
        });

        if (response.success) {
          // Thread reply will be added via WebSocket event
          showSuccess('Reply sent!');
        } else {
          throw new Error(response.error?.message || 'Failed to send reply');
        }
      } catch (error: any) {
        console.error('Failed to send thread reply:', error);
        showError(`Failed to send reply: ${error.message}`);
        throw error;
      }
    },
    [channelId, showSuccess, showError]
  );

  // Pin/unpin message
  const pinMessage = useCallback(
    async (messageId: string): Promise<void> => {
      try {
        const response = await messageService.pinMessage(channelId, messageId);
        if (response.success) {
          showSuccess('Message pinned!');
        } else {
          throw new Error(response.error?.message || 'Failed to pin message');
        }
      } catch (error: any) {
        console.error('Failed to pin message:', error);
        showError(`Failed to pin message: ${error.message}`);
        throw error;
      }
    },
    [channelId, showSuccess, showError]
  );

  const unpinMessage = useCallback(
    async (messageId: string): Promise<void> => {
      try {
        const response = await messageService.unpinMessage(channelId, messageId);
        if (response.success) {
          showSuccess('Message unpinned!');
        } else {
          throw new Error(response.error?.message || 'Failed to unpin message');
        }
      } catch (error: any) {
        console.error('Failed to unpin message:', error);
        showError(`Failed to unpin message: ${error.message}`);
        throw error;
      }
    },
    [channelId, showSuccess, showError]
  );

  // Enhanced WebSocket event handlers with sync support
  useEffect(() => {
    // WebSocket should already be connected via auth slice, just ensure it's ready
    if (!webSocketService.isConnected()) {
      webSocketService.connect().catch(error => {
        console.error('Failed to connect WebSocket:', error.message || error);
        setError(
          'Real-time features may be limited. Please refresh if issues persist.',
        );
      });
    }

    // Join channel for real-time updates
    webSocketService.joinChannel(channelId);

    // Message events
    const handleMessageSent = (data: WebSocketMessageEvent) => {
      console.log('🔥 WebSocket message_sent event received:', {
        eventChannelId: data.channelId || data.channel_id,
        currentChannelId: channelId,
        messageId: data.message?.id || data.data?.id,
        messageContent: data.message?.content || data.data?.content,
        messageReplyToId: data.message?.reply_to_id || data.data?.reply_to_id,
        messageHasReplyTo: !!(data.message?.reply_to || data.data?.reply_to),
        replyToObject: data.message?.reply_to || data.data?.reply_to,
        dataStructure: {
          hasMessage: !!data.message,
          hasData: !!data.data,
          dataHasMessage: !!((data as any).data?.message),
        },
        fullWebSocketData: data,
      });
      
      // Log the complete message object that will be used
      const messageForUI = (data as any).data?.message || data.message || data.data;

      // Handle both channelId and channel_id formats
      const eventChannelId = data.channelId || data.channel_id;

      if (eventChannelId === channelId) {
        // Validate that message data exists - handle different data structures
        let messageData = (data as any).data?.message || data.message || data.data;
        if (!messageData) {
          console.log('❌ No message data found in WebSocket event');
          return;
        }

        try {
          // This is the ONLY place messages should be added to UI
          const completeMessage = messageData as Message;
          
          console.log('🎯 Processing WebSocket message for UI update:', {
            messageId: completeMessage.id,
            content: completeMessage.content?.substring(0, 50),
            isReply: !!completeMessage.reply_to_id,
            hasCompleteReplyData: !!completeMessage.reply_to,
            replyToId: completeMessage.reply_to_id,
            replyToContent: completeMessage.reply_to?.content?.substring(0, 30)
          });
          
          updateMessages(prev => {
            // Check if message already exists (shouldn't happen with WebSocket-only approach)
            const existingMessageIndex = prev.findIndex(msg => msg.id === completeMessage.id);
            if (existingMessageIndex !== -1) {
              console.log('⚠️ Message already exists, replacing with WebSocket data:', {
                messageId: completeMessage.id,
                hadReplyTo: !!prev[existingMessageIndex].reply_to,
                nowHasReplyTo: !!completeMessage.reply_to
              });
              
              const updated = [...prev];
              updated[existingMessageIndex] = completeMessage;
              return updated;
            }
            
            console.log('✅ Adding new message from WebSocket (this is the source of truth):', {
              messageId: completeMessage.id,
              hasReplyTo: !!completeMessage.reply_to,
              replyToId: completeMessage.reply_to_id,
              userWillSeeCompleteData: true
            });
            
            return [...prev, completeMessage];
          });
        } catch (error) {
          console.error('Error processing message_sent event:', error);
        }
      }
    };

    const handleMessageUpdated = (
      data: WebSocketMessageEvent & { messageId: string },
    ) => {
      console.log('📝 WebSocket message_updated event received:', {
        eventChannelId: data.channelId,
        currentChannelId: channelId,
        messageId: data.messageId,
        hasMessageData: !!((data as any).data?.message || data.message),
        fullData: data,
      });

      if (data.channelId === channelId) {
        // Validate that message data exists - handle different data structures
        let messageData = (data as any).data?.message || data.message;
        if (!messageData) {
          console.log('❌ No message data found in message_updated event');
          return;
        }

        try {
          const updatedMessage = messageData as Message;
          console.log(
            '✅ Updating message:',
            updatedMessage.id,
            'with content:',
            updatedMessage.content,
          );
          setMessages(prev =>
            prev.map(msg => {
              if (msg.id === data.messageId) {
                // Preserve original author details when updating message
                return {
                  ...updatedMessage,
                  user_details: updatedMessage.user_details || msg.user_details,
                  user_id: updatedMessage.user_id || msg.user_id,
                };
              }
              return msg;
            }),
          );
        } catch (error) {
          console.error('Error processing message_updated event:', error);
        }
      }
    };

    const handleMessageDeleted = (data: any) => {
      console.log('🗑️ WebSocket message_deleted event received:', {
        eventChannelId: data.channelId,
        currentChannelId: channelId,
        messageId: data.messageId,
        fullData: data,
      });

      if (data.channelId === channelId && data.messageId) {
        console.log('✅ Marking message as deleted:', data.messageId);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.messageId 
              ? {
                  ...msg,
                  deleted_at: data.timestamp || new Date().toISOString(),
                  deleted_by: data.userId,
                  deleted_by_name: data.userName
                }
              : msg
          )
        );
      }
    };

    // Reaction events
    const handleReactionToggled = (data: WebSocketReactionEvent) => {
      const currentReactions = data.currentReactions || [];
      const updatedReactions = currentReactions.map(r => ({
        emoji: r.emoji,
        count: r.count,
        users: r.users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email || '',
          avatar: u.avatar_url || '',
          isOnline: true,
        })),
      }));

      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId
            ? { ...msg, reactions: updatedReactions }
            : msg,
        ),
      );
    };

    const handleReactionsCleared = (data: { messageId: string }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId ? { ...msg, reactions: [] } : msg,
        ),
      );
    };

    // Enhanced typing indicators with proper user management
    const handleTypingIndicator = (data: WebSocketTypingEvent) => {
      if (data.channelId === channelId) {
        const currentUserId = currentUser?.id;

        // Don't show typing indicator for current user
        if (data.userId === currentUserId) {
          return;
        }

        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.userId);

          if (data.isTyping) {
            // Add or update typing user
            const typingUser: TypingUser = {
              userId: data.userId,
              userName: data.userName || data.user?.name || 'Unknown User',
              userAvatar: data.userAvatar || data.user?.avatar_url,
              isTyping: true,
              lastTypingTime: Date.now(),
            };

            return [...filtered, typingUser];
          } else {
            // Remove typing user
            return filtered;
          }
        });
      }
    };

    // Thread reply events - MISSING FROM CURRENT IMPLEMENTATION
    const handleThreadReplySent = (data: any) => {
      console.log('🧵 WebSocket thread_reply_sent event received:', data);
      
      if (data.channelId === channelId) {
        const threadReply = data.message;
        if (threadReply) {
          updateMessages(prev => [...prev, threadReply]);
          
          // Update parent message thread info if available
          if (data.parentMessageId) {
            updateMessages(prev => prev.map(msg => 
              msg.id === data.parentMessageId
                ? { 
                    ...msg, 
                    reply_count: (msg.reply_count || 0) + 1,
                    last_reply_timestamp: threadReply.created_at
                  }
                : msg
            ));
          }
        }
      }
    };

    // Message reaction events - ENHANCED FOR BACKEND COMPATIBILITY
    const handleMessageReactionUpdated = (event: any) => {
      console.log('⚡ WebSocket message_reaction_updated event received:', event);
      
      // Handle both flat and nested data structures
      const data = event.data || event;
      const channelIdFromEvent = data.channelId || event.channelId;
      const messageId = data.messageId || event.messageId;
      const reactions = data.reactions || event.reactions;
      
      if (channelIdFromEvent === channelId && messageId) {
        console.log('🔄 Updating reactions for message:', messageId, 'with:', reactions);
        updateMessages(prev => prev.map(msg => 
          msg.id === messageId
            ? { ...msg, reactions: reactions || [] }
            : msg
        ));
      }
    };

    // Direct reply events - NEWLY ADDED
    const handleMessageReplySent = (data: any) => {
      console.log('↩️ WebSocket message_reply_sent event received:', data);
      
      if (data.channelId === channelId) {
        const replyMessage = data.message;
        if (replyMessage) {
          updateMessages(prev => [...prev, replyMessage]);
          
          // Update parent message reply count if available
          if (data.parentMessageId) {
            updateMessages(prev => prev.map(msg => 
              msg.id === data.parentMessageId
                ? { 
                    ...msg, 
                    reply_count: (msg.reply_count || 0) + 1,
                    last_reply_timestamp: replyMessage.created_at
                  }
                : msg
            ));
          }
        }
      }
    };

    // Reply update events - NEWLY ADDED  
    const handleReplyUpdated = (data: any) => {
      console.log('✏️ WebSocket reply_updated event received:', data);
      
      if (data.channelId === channelId && data.replyId) {
        updateMessages(prev => prev.map(msg => 
          msg.id === data.replyId
            ? { ...msg, ...data.reply, is_edited: true, edited_at: data.reply.edited_at }
            : msg
        ));
      }
    };

    // Reply deletion events - NEWLY ADDED
    const handleReplyDeleted = (data: any) => {
      console.log('🗑️ WebSocket reply_deleted event received:', data);
      
      if (data.channelId === channelId && data.replyId) {
        // Mark reply as deleted instead of removing it completely
        updateMessages(prev => 
          prev.map(msg => 
            msg.id === data.replyId 
              ? {
                  ...msg,
                  deleted_at: data.timestamp || new Date().toISOString(),
                  deleted_by: data.userId,
                  deleted_by_name: data.userName
                }
              : msg
          )
        );
        
        // Update parent message reply count if available
        if (data.messageId) {
          updateMessages(prev => prev.map(msg => 
            msg.id === data.messageId
              ? { 
                  ...msg, 
                  reply_count: Math.max((msg.reply_count || 1) - 1, 0)
                }
              : msg
          ));
        }
      }
    };

    // Message pin/unpin events - MISSING FROM CURRENT IMPLEMENTATION
    const handleMessagePinned = (data: any) => {
      console.log('📌 WebSocket message_pinned event received:', data);
      
      if (data.channelId === channelId && data.messageId) {
        updateMessages(prev => prev.map(msg => 
          msg.id === data.messageId
            ? { ...msg, is_pinned: data.pinned }
            : msg
        ));
      }
    };

    // Register event listeners
    webSocketService.on('message_sent', handleMessageSent);
    webSocketService.on('message_updated', handleMessageUpdated);
    webSocketService.on('message_deleted', handleMessageDeleted);
    webSocketService.on('thread_reply_sent', handleThreadReplySent); // ADDED
    webSocketService.on('message_reply_sent', handleMessageReplySent); // NEWLY ADDED
    webSocketService.on('reply_updated', handleReplyUpdated); // NEWLY ADDED
    webSocketService.on('reply_deleted', handleReplyDeleted); // NEWLY ADDED
    webSocketService.on('message_reaction_updated', handleMessageReactionUpdated); // ADDED
    webSocketService.on('message_pinned', handleMessagePinned); // ADDED
    webSocketService.on('message_unpinned', handleMessagePinned); // Same handler for unpin
    webSocketService.on('reaction_toggled', handleReactionToggled); // Keep for backward compatibility
    webSocketService.on('reactions_cleared', handleReactionsCleared);
    webSocketService.on('typing_indicator', handleTypingIndicator);

    // Enhanced connection state handling
    const handleConnectionStateChange = () => {
      const connectionState = webSocketService.getConnectionState();

      if (connectionState === 'connected') {
        setError(null); // Clear any connection errors
      } else if (connectionState === 'reconnecting') {
        setError('Reconnecting to server...');
      } else if (connectionState === 'disconnected') {
        const reconnectionInfo = webSocketService.getReconnectionInfo();
        if (reconnectionInfo.attempts >= reconnectionInfo.maxAttempts) {
          setError('Connection lost. Please refresh the page to reconnect.');
        }
      }
    };

    const handleMaxReconnectAttemptsReached = () => {
      setError(
        'Connection lost. Please check your internet connection and refresh the page.',
      );
    };

    const handleSyncResponse = (data: {
      messages: Message[];
      reactions: Array<{
        message_id: string;
        reactions: any[];
      }>;
    }) => {
      try {
        if (data.messages && data.messages.length > 0) {
          const syncedMessages = data.messages.filter(msg => {
            // Skip null/undefined messages
            if (!msg) {
              return false;
            }

            // Only process messages for current channel
            return msg.channel_id === channelId;
          }) as Message[]; // No transformation needed

          if (syncedMessages.length > 0) {
            updateMessages(prev => [...syncedMessages, ...prev]);
          }
        }

        // Handle synced reactions if needed
        if (data.reactions) {
          // Update reactions in existing messages
          data.reactions.forEach(reactionUpdate => {
            if (reactionUpdate && reactionUpdate.message_id) {
              updateMessages(prev =>
                prev.map(msg =>
                  msg.id === reactionUpdate.message_id
                    ? { ...msg, reactions: reactionUpdate.reactions || [] }
                    : msg,
                ),
              );
            }
          });
        }
      } catch (error) {
        console.error('❌ Error processing sync response:', error);
      }
    };

    // Register enhanced event listeners
    webSocketService.on('connect', handleConnectionStateChange);
    webSocketService.on('disconnect', handleConnectionStateChange);
    webSocketService.on(
      'max_reconnect_attempts_reached',
      handleMaxReconnectAttemptsReached,
    );
    webSocketService.on('sync_response', handleSyncResponse);

    return () => {
      // Cleanup event listeners
      webSocketService.off('message_sent', handleMessageSent);
      webSocketService.off('message_updated', handleMessageUpdated);
      webSocketService.off('message_deleted', handleMessageDeleted);
      webSocketService.off('thread_reply_sent', handleThreadReplySent); // ADDED
      webSocketService.off('message_reply_sent', handleMessageReplySent); // NEWLY ADDED
      webSocketService.off('reply_updated', handleReplyUpdated); // NEWLY ADDED
      webSocketService.off('reply_deleted', handleReplyDeleted); // NEWLY ADDED
      webSocketService.off('message_reaction_updated', handleMessageReactionUpdated); // ADDED
      webSocketService.off('message_pinned', handleMessagePinned); // ADDED
      webSocketService.off('message_unpinned', handleMessagePinned); // ADDED
      webSocketService.off('reaction_toggled', handleReactionToggled);
      webSocketService.off('reactions_cleared', handleReactionsCleared);
      webSocketService.off('typing_indicator', handleTypingIndicator);
      webSocketService.off('connect', handleConnectionStateChange);
      webSocketService.off('disconnect', handleConnectionStateChange);
      webSocketService.off(
        'max_reconnect_attempts_reached',
        handleMaxReconnectAttemptsReached,
      );
      webSocketService.off('sync_response', handleSyncResponse);

      // Leave channel
      webSocketService.leaveChannel(channelId);
    };
  }, [channelId, currentUser, updateMessages]);

  // Load initial messages when channel changes
  useEffect(() => {
    const loadKey = `${channelId}-channel`;

    if (loadedRef.current !== loadKey && loadMessagesRef.current) {
      // Reset state for new channel
      setMessages([]);
      setMessageIds(new Set());
      setError(null);
      setHasMoreMessages(true);
      setCurrentChannel(null);

      // Reset pagination state
      setPagination({
        offset: 0,
        limit: 20,
        total: 0,
        hasMore: true,
        nextCursor: null,
        isInitialLoad: true,
      });

      // Load messages and channel info
      loadMessagesRef.current();
      loadChannel();
    }
  }, [channelId, loadChannel]);

  // Enhanced cleanup for typing indicators with stale user removal
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const TYPING_TIMEOUT = 5000; // 5 seconds

      setTypingUsers(prev => {
        const filtered = prev.filter(u => {
          const isStale =
            !u.lastTypingTime || now - u.lastTypingTime > TYPING_TIMEOUT;
          if (isStale && u.isTyping) {
            console.log(
              `🧹 Removing stale typing indicator for user: ${u.userName}`,
            );
          }
          return !isStale;
        });

        // Only update state if there's a change to prevent unnecessary re-renders
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 1000);

    return () => {
      clearInterval(interval);

      // Clean up all typing-related timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Force reconnection function
  const forceReconnect = useCallback(async () => {
    try {
      setError('Reconnecting...');
      await webSocketService.forceReconnect();
      setError(null);
      console.log('✅ Manual reconnection successful');
    } catch (error) {
      console.error('❌ Manual reconnection failed:', error);
      setError('Failed to reconnect. Please try again.');
    }
  }, []);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    error,
    typingUsers,
    pagination,
    sendMessage,
    sendThreadReply, // ADDED
    editMessage,
    deleteMessage,
    pinMessage, // ADDED
    unpinMessage, // ADDED
    loadMoreMessages,
    startTyping,
    stopTyping,
    forceReconnect,
    // Connection state
    connectionState: webSocketService.getConnectionState(),
    reconnectionInfo: webSocketService.getReconnectionInfo(),
    isConnected: webSocketService.isConnected(),
    // Message state getters
    editingMessages,
    deletingMessages,
    // Permission state
    canSendMessage: canSendMessage(currentChannel, currentUser),
    currentChannel,
  };
};
