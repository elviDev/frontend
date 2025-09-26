import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useToast } from '../contexts/ToastContext';
import { RootState } from '../store/store';
import type { Message, TypingUser, MessagesResponse } from '../types/message';
import { messageService } from '../services/messageService';
import { webSocketService } from '../services/websocketService';

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
  
  // Production-grade state management
  const [editingMessages, setEditingMessages] = useState<Set<string>>(new Set());
  const [deletingMessages, setDeletingMessages] = useState<Set<string>>(new Set());
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
  

  // Helper function to ensure message has required properties
  const normalizeMessage = useCallback((msg: Message): Message => {
    let reactions = msg.reactions || [];
    
    // If reactions is an object, convert to array
    if (typeof reactions === 'object' && !Array.isArray(reactions)) {
      reactions = Object.values(reactions);
    }
    
    // Ensure it's an array
    if (!Array.isArray(reactions)) {
      reactions = [];
    }
    
    return {
      ...msg,
      reactions,
      attachments: msg.attachments || {},
      mentions: msg.mentions || [],
    };
  }, []);

  // Message state updater with ID-based deduplication
  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
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
  }, [normalizeMessage]);

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
      
      if (response.success || (response.data !== undefined && response.data !== null)) {
        // Handle empty messages array gracefully
        const messagesArray = Array.isArray(response.data) ? response.data : [];
        // Double-check component is still mounted before updating state
        if (isMountedRef.current) {
          // Sort messages by timestamp (oldest first)
          const sortedMessages = messagesArray.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setMessages(sortedMessages);
          const paginationData = response.pagination || { hasMore: false, has_more: false, total: 0, next_cursor: null, nextCursor: null };
          setHasMoreMessages(paginationData.hasMore || paginationData.has_more || false);
          
          // Initialize pagination state for channel
          setPagination({
            offset: sortedMessages.length,
            limit: 20,
            total: paginationData.total || 0,
            hasMore: paginationData.hasMore || paginationData.has_more || false,
            nextCursor: (paginationData as any).next_cursor || (paginationData as any).nextCursor || null,
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
      const isEmptyResult = err.error?.statusCode === 404 || 
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
      if (err.name === 'TypeError' && err.message.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection or try again later.';
      } else if (err.message?.includes('fetch') || err.message?.includes('network')) {
        errorMessage = 'Connection error. Please check your internet connection and try again.';
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
      const response = await messageService.getChannelMessages(channelId, requestOptions);
      
      if (response.success && isMountedRef.current) {
        // Handle empty messages array gracefully
        const messagesArray = Array.isArray(response.data) ? response.data : [];
        
        // Smart message merging to prevent duplicates
        updateMessages(prev => [...prev, ...messagesArray]);
        
        // Update pagination state
        const paginationData = response.pagination || { hasMore: false, has_more: false, total: 0, next_cursor: null, nextCursor: null };
        setPagination(prev => ({
          ...prev,
          offset: prev.offset + messagesArray.length,
          hasMore: paginationData.hasMore || paginationData.has_more || false,
          nextCursor: (paginationData as any).next_cursor || (paginationData as any).nextCursor || null,
          total: paginationData.total || prev.total,
        }));
        
        setHasMoreMessages(paginationData.hasMore || paginationData.has_more || false);
      }
    } catch (err: any) {
      console.error('Failed to load more messages:', err.message || err);
      
      if (isMountedRef.current) {
        // Check if this is a "not found" or "no content" type error
        const isEmptyResult = err.error?.statusCode === 404 || 
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
        const errorMessage = err.error?.message || err.message || 'Failed to load more messages';
        
        if (err.name === 'TypeError' && err.message.includes('Network request failed')) {
          showError('Network error. Please check your connection and try again.');
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
    updateMessages
  ]);

  const sendMessage = useCallback(async (params: SendMessageParams, retryCount = 0): Promise<Message | undefined> => {
    try {
      // Send message directly without optimistic updates
      const response = await messageService.sendMessage(channelId, {
        content: params.content,
        message_type: params.type === 'image' ? 'file' : (params.type as 'text' | 'voice' | 'file' | 'system'),
        reply_to_id: params.replyTo?.id,
        attachments: params.attachments?.map(att => ({
          file_id: att.id,
          filename: att.name,
          file_type: att.type,
          file_size: att.size || 0,
        })),
      });

      if (response.success) {
        showSuccess('Message sent!');
        return response.data as Message;
      } else {
        throw new Error((response as any).error?.message || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('❌ Failed to send message:', err);

      // Enhanced error handling with retry capability
      const shouldRetry = retryCount < 2 && (
        err.name === 'TypeError' && err.message.includes('Network request failed') ||
        err.error?.statusCode >= 500
      );

      if (shouldRetry) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return sendMessage(params, retryCount + 1);
      }

      const errorMessage = err.error?.message || err.message || 'Failed to send message';
      showError(`Failed to send message: ${errorMessage}`);

      throw err;
    }
  }, [showSuccess, showError, channelId]);

  const editMessage = useCallback(async (messageId: string, content: string, retryCount = 0): Promise<void> => {
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

    // Optimistically update with loading state
    const optimisticMessage = {
      ...originalMessage,
      content,
      isEdited: true,
      editedAt: new Date(),
      isBeingEdited: true,
    };

    updateMessages(prev => prev.map(msg => 
      msg.id === messageId ? optimisticMessage : msg
    ));

    try {
      const response = await messageService.editMessage(channelId, messageId, content);
      
      if (response.success && response.data) {
        // Update with real data from API (no transformation needed)
        const updatedMessage = response.data as Message;
        const finalMessage = {
          ...updatedMessage,
          isBeingEdited: false,
        };
        
        updateMessages(prev => prev.map(msg => 
          msg.id === messageId ? finalMessage : msg
        ));
        
        showSuccess('Message updated!');
      } else {
        throw new Error((response as any).error?.message || 'Failed to edit message');
      }
    } catch (err: any) {
      console.error('❌ Failed to edit message:', err);
      
      // Enhanced error handling with retry capability
      const shouldRetry = retryCount < 2 && (
        err.name === 'TypeError' && err.message.includes('Network request failed') ||
        err.error?.statusCode >= 500
      );
      
      if (shouldRetry) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        
        return editMessage(messageId, content, retryCount + 1);
      }
      
      // Revert to original message on final failure
      updateMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...originalMessage, isBeingEdited: false } : msg
      ));
      
      
      const errorMessage = err.error?.message || err.message || 'Failed to edit message';
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
  }, [messages, editingMessages, updateMessages, showSuccess, showError]);

  const deleteMessage = useCallback(async (messageId: string, retryCount = 0): Promise<void> => {
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

    // Optimistically mark as deleted with loading state
    const optimisticMessage = {
      ...originalMessage,
      isDeleted: true,
      deletedAt: new Date(),
      content: '',
      isBeingDeleted: true,
    };

    updateMessages(prev => prev.map(msg => 
      msg.id === messageId ? optimisticMessage : msg
    ));

    try {
      const response = await messageService.deleteMessage(channelId, messageId);
      
      if (response.success) {
        // Remove message from list completely on successful delete
        updateMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        
        showSuccess('Message deleted!');
      } else {
        throw new Error((response as any).error?.message || 'Failed to delete message');
      }
    } catch (err: any) {
      console.error('❌ Failed to delete message:', err);
      
      // Enhanced error handling with retry capability
      const shouldRetry = retryCount < 2 && (
        err.name === 'TypeError' && err.message.includes('Network request failed') ||
        err.error?.statusCode >= 500
      );
      
      if (shouldRetry) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        
        return deleteMessage(messageId, retryCount + 1);
      }
      
      // Revert to original message on final failure
      updateMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...originalMessage, isBeingDeleted: false } : msg
      ));
      
      
      const errorMessage = err.error?.message || err.message || 'Failed to delete message';
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
  }, [messages, deletingMessages, updateMessages, showSuccess, showError]);


  const addReaction = useCallback(async (messageId: string, emoji: string): Promise<void> => {
    try {
      const currentUserId = currentUser?.id || 'current-user';
      const originalMessage = messages.find(m => m.id === messageId);
      
      if (!originalMessage) {
        return;
      }
    
    // Optimistically update UI
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;

      // Ensure reactions array exists - handle both array and object formats
      let reactions = msg.reactions || [];
      
      // If reactions is an object, convert to array
      if (typeof reactions === 'object' && !Array.isArray(reactions)) {
        reactions = Object.values(reactions);
      }
      
      // Ensure it's an array
      if (!Array.isArray(reactions)) {
        reactions = [];
      }
      const existingReaction = reactions.find(r => r.emoji === emoji);
      const userAlreadyReacted = existingReaction?.users.some((u: any) => u.id === currentUserId);

      if (userAlreadyReacted) {
        
        // Remove user's reaction
        return {
          ...msg,
          reactions: reactions.map(r => 
            r.emoji === emoji
              ? {
                  ...r,
                  users: r.users.filter((u: any) => u.id !== currentUserId),
                  count: r.count - 1,
                }
              : r
          ).filter(r => r.count > 0),
        };
      } else {
        // Add user's reaction
        if (existingReaction) {
          return {
            ...msg,
            reactions: reactions.map(r => 
              r.emoji === emoji
                ? {
                    ...r,
                    users: [...r.users, { 
                      id: currentUserId, 
                      name: currentUser?.name || 'Current User',
                      email: currentUser?.email || '',
                      isOnline: true,
                    }],
                    count: r.count + 1,
                  }
                : r
            ),
          };
        } else {
          return {
            ...msg,
            reactions: [...reactions, {
              emoji,
              users: [{ 
                id: currentUserId, 
                name: currentUser?.name || 'Current User',
                email: currentUser?.email || '',
                isOnline: true,
              }],
              count: 1,
            }],
          };
        }
      }
    }));

    try {
      const response = await messageService.toggleReaction(channelId, messageId, emoji);
      
      if (response.success) {
        
        // Handle different response formats
        let currentReactions = [];
        if (response.data?.current_reactions) {
          // Expected format: {current_reactions: [...]}
          currentReactions = response.data.current_reactions;
        } else if (Array.isArray(response.data)) {
          // Alternative format: direct array
          currentReactions = response.data;
        } else {
          // Keep the optimistic update, don't revert
          return;
        }
        const updatedReactions = currentReactions.map((r: {
          emoji: string;
          count: number;
          users: Array<{
            id: string;
            name: string;
            email?: string;
            avatar_url?: string;
          }>;
        }) => ({
          emoji: r.emoji,
          count: r.count,
          users: r.users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email || '',
            avatar: u.avatar_url || '',
            isOnline: true,
          })),
        }));
        
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, reactions: updatedReactions }
            : msg
        ));
      }
    } catch (err: any) {
      console.error('Failed to toggle reaction:', err.message || err);
      // Revert on error - ensure original message has reactions array
      const safeOriginalMessage = {
        ...originalMessage,
        reactions: originalMessage.reactions || []
      };
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? safeOriginalMessage : msg
      ));
    }
    } catch (error: any) {
      console.error('Critical error in addReaction:', error.message || error);
      // Don't update UI state on critical errors
    }
  }, [currentUser, messages, channelId]);

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

  // Enhanced WebSocket event handlers with sync support
  useEffect(() => {
    // WebSocket should already be connected via auth slice, just ensure it's ready
    if (!webSocketService.isConnected()) {
      webSocketService.connect().catch(error => {
        console.error('Failed to connect WebSocket:', error.message || error);
        setError('Real-time features may be limited. Please refresh if issues persist.');
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
        fullData: data
      });

      // Handle both channelId and channel_id formats
      const eventChannelId = data.channelId || data.channel_id;

      if (eventChannelId === channelId) {
        // Validate that message data exists - handle different data structures
        let messageData = data.data?.message || data.message;
        if (!messageData) {
          return;
        }

        try {
          // New message in current channel - check for duplicates before adding
          const newMessage = messageData as Message;
          updateMessages(prev => {
            // Check if message already exists
            const messageExists = prev.some(msg => msg.id === newMessage.id);
            if (messageExists) {
              console.log('Duplicate message detected, skipping:', newMessage.id);
              return prev;
            }
            return [...prev, newMessage];
          });
        } catch (error) {
          console.error('Error processing message_sent event:', error);
        }
      }
    };

    const handleMessageUpdated = (data: WebSocketMessageEvent & { messageId: string }) => {
      console.log('📝 WebSocket message_updated event received:', {
        eventChannelId: data.channelId,
        currentChannelId: channelId,
        messageId: data.messageId,
        hasMessageData: !!(((data as any).data?.message || data.message)),
        fullData: data
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
          console.log('✅ Updating message:', updatedMessage.id, 'with content:', updatedMessage.content);
          setMessages(prev => prev.map(msg =>
            msg.id === data.messageId ? updatedMessage : msg
          ));
        } catch (error) {
          console.error('Error processing message_updated event:', error);
        }
      }
    };

    const handleMessageDeleted = (data: { channelId: string; messageId: string }) => {
      console.log('🗑️ WebSocket message_deleted event received:', {
        eventChannelId: data.channelId,
        currentChannelId: channelId,
        messageId: data.messageId,
        fullData: data
      });

      if (data.channelId === channelId) {
        console.log('✅ Deleting message:', data.messageId);
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== data.messageId);
          console.log('Messages before deletion:', prev.length, 'After deletion:', filtered.length);
          return filtered;
        });
      }
    };

    // Reaction events
    const handleReactionToggled = (data: WebSocketReactionEvent) => {
      const currentReactions = data.currentReactions || [];
      const updatedReactions = currentReactions.map((r) => ({
        emoji: r.emoji,
        count: r.count,
        users: r.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email || '',
          avatar: u.avatar_url || '',
          isOnline: true,
        })),
      }));
      
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: updatedReactions }
          : msg
      ));
    };

    const handleReactionsCleared = (data: { messageId: string }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: [] }
          : msg
      ));
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

    // Register event listeners
    webSocketService.on('message_sent', handleMessageSent);
    webSocketService.on('message_updated', handleMessageUpdated);
    webSocketService.on('message_deleted', handleMessageDeleted);
    webSocketService.on('reaction_toggled', handleReactionToggled);
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
      setError('Connection lost. Please check your internet connection and refresh the page.');
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
          const syncedMessages = data.messages
            .filter(msg => {
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
              updateMessages(prev => prev.map(msg => 
                msg.id === reactionUpdate.message_id 
                  ? { ...msg, reactions: reactionUpdate.reactions || [] }
                  : msg
              ));
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
    webSocketService.on('max_reconnect_attempts_reached', handleMaxReconnectAttemptsReached);
    webSocketService.on('sync_response', handleSyncResponse);

    return () => {
      // Cleanup event listeners
      webSocketService.off('message_sent', handleMessageSent);
      webSocketService.off('message_updated', handleMessageUpdated);
      webSocketService.off('message_deleted', handleMessageDeleted);
      webSocketService.off('reaction_toggled', handleReactionToggled);
      webSocketService.off('reactions_cleared', handleReactionsCleared);
      webSocketService.off('typing_indicator', handleTypingIndicator);
      webSocketService.off('connect', handleConnectionStateChange);
      webSocketService.off('disconnect', handleConnectionStateChange);
      webSocketService.off('max_reconnect_attempts_reached', handleMaxReconnectAttemptsReached);
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

      // Reset pagination state
      setPagination({
        offset: 0,
        limit: 20,
        total: 0,
        hasMore: true,
        nextCursor: null,
        isInitialLoad: true,
      });
      
      // Use the ref to avoid dependency issues
      loadMessagesRef.current();
    }
  }, [channelId]);

  // Enhanced cleanup for typing indicators with stale user removal
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const TYPING_TIMEOUT = 5000; // 5 seconds
      
      setTypingUsers(prev => {
        const filtered = prev.filter(u => {
          const isStale = !u.lastTypingTime || (now - u.lastTypingTime) > TYPING_TIMEOUT;
          if (isStale && u.isTyping) {
            console.log(`🧹 Removing stale typing indicator for user: ${u.userName}`);
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
    editMessage,
    deleteMessage,
    addReaction,
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
  };
};

