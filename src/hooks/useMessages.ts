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
  message: Message;
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
  const [messageCache, setMessageCache] = useState<Map<string, Message>>(new Map());
  const [optimisticMessages, setOptimisticMessages] = useState<Set<string>>(new Set());
  const [failedMessages, setFailedMessages] = useState<Set<string>>(new Set());
  const [editingMessages, setEditingMessages] = useState<Set<string>>(new Set());
  const [deletingMessages, setDeletingMessages] = useState<Set<string>>(new Set());
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(Date.now());
  
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
      console.log('🔄 normalizeMessage: Converting reactions object to array:', reactions);
      reactions = Object.values(reactions);
    }
    
    // Ensure it's an array
    if (!Array.isArray(reactions)) {
      console.warn('⚠️ normalizeMessage: Reactions is not an array, defaulting to empty array:', reactions);
      reactions = [];
    }
    
    return {
      ...msg,
      reactions,
      attachments: msg.attachments || {},
      mentions: msg.mentions || [],
    };
  }, []);

  // Enhanced deduplication with conflict resolution
  const deduplicateMessages = useCallback((msgs: Message[]): Message[] => {
    const messageMap = new Map<string, Message>();
    const seen = new Set<string>();
    
    msgs.forEach(msg => {
      // Skip null/undefined messages or messages without IDs
      if (!msg || !msg.id) {
        console.warn('🚨 Invalid message detected:', msg);
        return;
      }
      
      if (seen.has(msg.id)) {
        console.warn('🚨 Duplicate message detected:', msg.id);
        
        // Conflict resolution: prefer non-optimistic over optimistic
        const existing = messageMap.get(msg.id);
        if (existing?.isOptimistic && !msg.isOptimistic) {
          messageMap.set(msg.id, normalizeMessage(msg));
          console.log('🔄 Resolved conflict: replaced optimistic with real message');
        }
        return;
      }
      
      seen.add(msg.id);
      messageMap.set(msg.id, normalizeMessage(msg));
    });
    
    return Array.from(messageMap.values());
  }, [normalizeMessage]);

  // Message cache management for better performance
  const updateMessageCache = useCallback((newMessages: Message[]) => {
    setMessageCache(prev => {
      const updated = new Map(prev);
      newMessages.forEach(msg => {
        // Only update if message is newer or doesn't exist
        const existing = updated.get(msg.id);
        if (!existing || new Date(msg.created_at) >= new Date(existing.created_at)) {
          updated.set(msg.id, msg);
        }
      });
      return updated;
    });
  }, []);

  // Smart message state updater with cache synchronization
  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessages(prev => {
      const updated = updater(prev);
      const deduplicated = deduplicateMessages(updated);
      
      // Update cache
      updateMessageCache(deduplicated);
      
      return deduplicated;
    });
  }, [deduplicateMessages, updateMessageCache]);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadedRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const loadMessagesRef = useRef<(() => Promise<void>) | null>(null);
  const pendingRequestsRef = useRef<Set<string>>(new Set());
  const lastTypingTimestampRef = useRef<number>(0);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const maxReconnectAttempts = 5;

  // No transformation needed - use backend data directly


  const loadMessages = useCallback(async () => {
    const loadKey = `${channelId}-channel`;
    console.log('🔄 loadMessages called for:', loadKey);
    
    // Cancel any existing load operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Check if already loaded or component unmounted
    if (loadedRef.current === loadKey || !isMountedRef.current) {
      console.log('⏸️ Skipping load - already loaded or unmounted:', { loadedKey: loadedRef.current, mounted: isMountedRef.current });
      return;
    }

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    console.log('📡 Starting message load...');
    setIsLoading(true);
    setError(null);

    try {
      console.log('📨 Loading channel messages for:', channelId);
      const response = await messageService.getChannelMessages(channelId, {
        limit: 50,
        offset: 0,
      });
      
      console.log('📨 Channel messages response:', response);
      
      // Check if operation was aborted
      if (signal.aborted || !isMountedRef.current) return;
      
      if (response.success || (response.data !== undefined && response.data !== null)) {
        // Handle empty messages array gracefully
        const messagesArray = Array.isArray(response.data) ? response.data : [];
        console.log('📨 Raw messages from API:', messagesArray);
        // Double-check component is still mounted before updating state
        if (isMountedRef.current) {
          // Sort messages by timestamp (oldest first)
          const sortedMessages = messagesArray.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setMessages(deduplicateMessages(sortedMessages));
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
        console.error('❌ Channel messages response not successful:', response);
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
      console.error('💥 Load messages error:', {
        error: err,
        message: err.message,
        stack: err.stack,
        name: err.name,
        channelId,
        apiError: err.error
      });
      
      // Check if this is a "not found" or "no content" type error
      const isEmptyResult = err.error?.statusCode === 404 || 
                          err.error?.statusCode === 204 ||
                          err.error?.message?.toLowerCase().includes('not found') ||
                          err.error?.message?.toLowerCase().includes('no messages') ||
                          err.error?.message?.toLowerCase().includes('no replies');
      
      if (isEmptyResult && isMountedRef.current && !signal.aborted) {
        // Handle empty state gracefully without showing an error
        console.log('📭 No messages found, showing empty state');
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
        console.error('🌐 Network error - backend may not be accessible');
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
      console.log('🏁 Load messages finished');
      // Only update loading state if component is still mounted and operation wasn't aborted
      if (isMountedRef.current && !signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [channelId, deduplicateMessages]);

  // Store loadMessages in ref for stable reference in useEffect
  loadMessagesRef.current = loadMessages;

  // Enhanced load more with intelligent pagination and caching
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || !pagination.hasMore) {
      console.log('🚫 Load more blocked:', {
        isLoadingMore,
        hasMoreMessages,
        paginationHasMore: pagination.hasMore
      });
      return;
    }

    // Enhanced request deduplication with pagination state
    const requestKey = `loadMore-${channelId}-channel-${pagination.offset}-${pagination.nextCursor || 'none'}`;
    if (pendingRequestsRef.current.has(requestKey)) {
      console.log('🔄 Skipping duplicate loadMore request:', requestKey);
      return;
    }

    pendingRequestsRef.current.add(requestKey);
    setIsLoadingMore(true);
    
    console.log('📄 Loading more messages:', {
      currentOffset: pagination.offset,
      currentCount: messages.length,
      nextCursor: pagination.nextCursor
    });

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
        console.log('📨 Loaded', messagesArray.length, 'more channel messages');
        
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
      
      console.log('✅ Load more completed successfully');
    } catch (err: any) {
      console.error('💥 Failed to load more messages:', err);
      
      if (isMountedRef.current) {
        // Check if this is a "not found" or "no content" type error
        const isEmptyResult = err.error?.statusCode === 404 || 
                            err.error?.statusCode === 204 ||
                            err.error?.message?.toLowerCase().includes('not found') ||
                            err.error?.message?.toLowerCase().includes('no messages') ||
                            err.error?.message?.toLowerCase().includes('no replies');
        
        if (isEmptyResult) {
          // Handle empty state gracefully without showing an error
          console.log('📭 No more messages found');
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
    console.log('👤 Current user in sendMessage:', currentUser);
    
    const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Create optimistic message for immediate UI feedback using backend format
    const optimisticMessage: Message = {
      id: optimisticId,
      channel_id: channelId,
      task_id: null,
      user_id: currentUser?.id || 'current-user',
      content: params.content,
      message_type: params.type === 'image' ? 'file' : params.type,
      voice_data: null,
      transcription: null,
      attachments: {},
      reply_to: params.replyTo,
      thread_root: null,
      is_edited: false,
      is_pinned: false,
      is_announcement: false,
      reactions: [],
      mentions: [],
      ai_generated: false,
      ai_context: null,
      command_execution_id: null,
      metadata: {},
      formatting: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      edited_at: null,
      version: 1,
      deleted_at: null,
      deleted_by: null,
      thread_root_id: null,
      reply_to_id: params.replyTo?.id || null,
      is_thread_root: false,
      user_name: currentUser?.name || 'Current User',
      user_email: currentUser?.email || '',
      user_avatar: currentUser?.avatar_url || null,
      user_role: currentUser?.role || 'member',
      thread_info: null,
      reply_count: 0,
      last_reply_timestamp: null,
      deleted_by_name: null,
      isOptimistic: true,
      isSending: true,
    };

    // Track optimistic message
    setOptimisticMessages(prev => new Set([...Array.from(prev), optimisticId]));

    // Add optimistic message at the end (newest messages last)
    updateMessages(prev => [...prev, optimisticMessage]);

    console.log('📤 Sending message optimistically:', optimisticId);

    try {
      // Send as channel message  
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

      if (response.success && response.data) {
        // Replace optimistic message with real message from API (no transformation needed)
        const realMessage = response.data as Message;
        console.log('🔄 Replacing optimistic message with real message:', {
          optimisticId,
          realId: realMessage.id,
          realMessage
        });
        
        updateMessages(prev => prev.map(msg => 
          msg.id === optimisticId ? realMessage : msg
        ));
        
        // Update message cache
        updateMessageCache([realMessage]);
        
        console.log('✅ Message sent successfully:', realMessage.id);
        showSuccess('Message sent!');
        
        return realMessage;
      } else if (response.success && !response.data) {
        // Success but no data returned - keep optimistic message as final
        console.log('✅ Message sent (no server response data), keeping optimistic:', optimisticId);
        updateMessages(prev => prev.map(msg => 
          msg.id === optimisticId 
            ? { ...msg, isOptimistic: false, isSending: false }
            : msg
        ));
        showSuccess('Message sent!');
        return undefined;
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
        console.log(`🔄 Retrying send (attempt ${retryCount + 1}/3):`, optimisticId);
        
        // Update message to show retry state
        updateMessages(prev => prev.map(msg => 
          msg.id === optimisticId 
            ? { ...msg, sendError: `Retrying... (${retryCount + 1}/3)` }
            : msg
        ));
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        
        return sendMessage(params, retryCount + 1);
      }
      
      // Mark message as failed after all retries
      updateMessages(prev => prev.map(msg => 
        msg.id === optimisticId 
          ? { 
              ...msg, 
              isSending: false, 
              sendError: err.error?.message || err.message || 'Failed to send',
              hasFailed: true
            }
          : msg
      ));
      
      // Add to failed messages set
      setFailedMessages(prev => new Set([...Array.from(prev), optimisticId]));
      
      const errorMessage = err.error?.message || err.message || 'Failed to send message';
      showError(`Failed to send message: ${errorMessage}`);
      
      throw err;
    } finally {
      // Remove from optimistic messages set
      setOptimisticMessages(prev => {
        const updated = new Set(prev);
        updated.delete(optimisticId);
        return updated;
      });
    }
  }, [showSuccess, showError, currentUser, channelId, updateMessages, updateMessageCache]);

  const editMessage = useCallback(async (messageId: string, content: string, retryCount = 0): Promise<void> => {
    const originalMessage = messages.find(m => m.id === messageId);
    if (!originalMessage) {
      console.warn('⚠️ Cannot edit message: message not found:', messageId);
      return;
    }

    // Prevent editing if already being edited
    if (editingMessages.has(messageId)) {
      console.warn('⚠️ Cannot edit message: already being edited:', messageId);
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

    console.log('✏️ Editing message optimistically:', messageId);

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
        
        // Update message cache
        updateMessageCache([finalMessage]);
        
        console.log('✅ Message edited successfully:', messageId);
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
        console.log(`🔄 Retrying edit (attempt ${retryCount + 1}/3):`, messageId);
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        
        return editMessage(messageId, content, retryCount + 1);
      }
      
      // Revert to original message on final failure
      updateMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...originalMessage, isBeingEdited: false } : msg
      ));
      
      // Add to failed messages set
      setFailedMessages(prev => new Set([...Array.from(prev), messageId]));
      
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
  }, [messages, editingMessages, updateMessages, updateMessageCache, showSuccess, showError]);

  const deleteMessage = useCallback(async (messageId: string, retryCount = 0): Promise<void> => {
    const originalMessage = messages.find(m => m.id === messageId);
    if (!originalMessage) {
      console.warn('⚠️ Cannot delete message: message not found:', messageId);
      return;
    }

    // Prevent deleting if already being deleted
    if (deletingMessages.has(messageId)) {
      console.warn('⚠️ Cannot delete message: already being deleted:', messageId);
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

    console.log('🗑️ Deleting message optimistically:', messageId);

    try {
      const response = await messageService.deleteMessage(channelId, messageId);
      
      if (response.success) {
        // Remove message from list completely on successful delete
        updateMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        // Update message cache
        setMessageCache(prev => {
          const updated = new Map(prev);
          updated.delete(messageId);
          return updated;
        });
        
        console.log('✅ Message deleted successfully:', messageId);
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
        console.log(`🔄 Retrying delete (attempt ${retryCount + 1}/3):`, messageId);
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        
        return deleteMessage(messageId, retryCount + 1);
      }
      
      // Revert to original message on final failure
      updateMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...originalMessage, isBeingDeleted: false } : msg
      ));
      
      // Add to failed messages set
      setFailedMessages(prev => new Set([...Array.from(prev), messageId]));
      
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
      console.log('🎭 addReaction: Starting reaction addition:', { messageId, emoji, currentUserId: currentUser?.id });
      
      const currentUserId = currentUser?.id || 'current-user';
      const originalMessage = messages.find(m => m.id === messageId);
      
      if (!originalMessage) {
        console.warn('⚠️ addReaction: Message not found:', messageId);
        return;
      }
      
      console.log('🎭 addReaction: Original message found:', {
        id: originalMessage.id,
        reactions: originalMessage.reactions,
        hasReactions: !!originalMessage.reactions
      });
    
    // Optimistically update UI
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;

      // Ensure reactions array exists - handle both array and object formats
      let reactions = msg.reactions || [];
      
      // If reactions is an object, convert to array
      if (typeof reactions === 'object' && !Array.isArray(reactions)) {
        console.log('🔄 Converting reactions object to array:', reactions);
        reactions = Object.values(reactions);
      }
      
      // Ensure it's an array
      if (!Array.isArray(reactions)) {
        console.warn('⚠️ Reactions is not an array, defaulting to empty array:', reactions);
        reactions = [];
      }
      
      console.log('🎭 Using reactions array:', reactions);
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
      console.log('📡 Calling toggleReaction API:', { channelId, messageId, emoji });
      const response = await messageService.toggleReaction(channelId, messageId, emoji);
      console.log('📡 toggleReaction API response:', response);
      
      if (response.success) {
        console.log('✅ toggleReaction API succeeded, processing response data:', response.data);
        
        // Handle different response formats
        let currentReactions = [];
        if (response.data?.current_reactions) {
          // Expected format: {current_reactions: [...]}
          currentReactions = response.data.current_reactions;
        } else if (Array.isArray(response.data)) {
          // Alternative format: direct array
          currentReactions = response.data;
        } else {
          console.warn('⚠️ Unexpected API response format, keeping optimistic reaction');
          // Keep the optimistic update, don't revert
          return;
        }
        
        console.log('📡 Processing currentReactions:', currentReactions);
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
      console.error('🚨 addReaction: Failed to toggle reaction:', err);
      console.error('🚨 addReaction: Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        response: err.response
      });
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
      console.error('🚨 addReaction: Outer catch - Critical error in addReaction:', error);
      console.error('🚨 addReaction: Error stack:', error.stack);
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
      console.log('⚠️ WebSocket not connected, attempting to connect...');
      webSocketService.connect().catch(error => {
        console.error('❌ Failed to connect WebSocket in useMessages:', error);
        setError('Real-time features may be limited. Please refresh if issues persist.');
      });
    }

    // Join channel for real-time updates
    webSocketService.joinChannel(channelId);

    // Message events
    const handleMessageSent = (data: WebSocketMessageEvent) => {
      console.log('📨 WebSocket message_sent event received:', data);
      
      // Handle both channelId and channel_id formats
      const eventChannelId = data.channelId || data.channel_id;
      
      if (eventChannelId === channelId) {
        // Validate that message data exists and is not null/undefined
        if (!data.message) {
          console.warn('🚨 Received message_sent event with null/undefined message data:', data);
          return;
        }
        
        try {
          console.log('📨 Raw WebSocket message data:', data.message);
          
          // New message in current channel (no transformation needed)
          const newMessage = data.message as Message;
          console.log('📥 Adding new message from WebSocket:', newMessage);
          console.log('📥 WebSocket message reactions:', newMessage.reactions);
          // Use updateMessages instead of setMessages to ensure deduplication
          updateMessages(prev => {
            // Check if this message already exists (avoid duplicates from optimistic updates)
            const existingIndex = prev.findIndex(msg => msg.id === newMessage.id);
            if (existingIndex >= 0) {
              // Replace existing message (could be optimistic)
              console.log('🔄 Replacing existing message:', newMessage.id);
              return prev.map(msg => msg.id === newMessage.id ? newMessage : msg);
            } else {
              // Add new message
              console.log('➕ Adding new message:', newMessage.id);
              return [...prev, newMessage];
            }
          });
        } catch (error) {
          console.error('❌ Error processing message_sent event:', error);
          console.log('📋 Message data that caused error:', data);
        }
      } else {
        console.log('📭 Message_sent event for different channel:', eventChannelId, 'current:', channelId);
      }
    };

    const handleMessageUpdated = (data: WebSocketMessageEvent & { messageId: string }) => {
      if (data.channelId === channelId) {
        // Validate that message data exists and is not null/undefined
        if (!data.message) {
          console.warn('🚨 Received message_updated event with null/undefined message data:', data);
          return;
        }
        
        try {
          const updatedMessage = data.message as Message;
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId ? updatedMessage : msg
          ));
        } catch (error) {
          console.error('❌ Error processing message_updated event:', error);
          console.log('📋 Message data that caused error:', data);
        }
      }
    };

    const handleMessageDeleted = (data: { channelId: string; messageId: string }) => {
      if (data.channelId === channelId) {
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      }
    };

    // Reaction events
    const handleReactionToggled = (data: WebSocketReactionEvent) => {
      console.log('🎭 WebSocket reaction_toggled event received:', data);
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
      console.log('📶 WebSocket connection state changed:', connectionState);

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
      console.log('🔄 Processing sync response:', data);
      
      try {
        if (data.messages && data.messages.length > 0) {
          const syncedMessages = data.messages
            .filter(msg => {
              // Skip null/undefined messages
              if (!msg) {
                console.warn('🚨 Received null/undefined message in sync response');
                return false;
              }
              
              // Only process messages for current channel
              return msg.channel_id === channelId;
            }) as Message[]; // No transformation needed
          
          if (syncedMessages.length > 0) {
            console.log('✅ Synced', syncedMessages.length, 'messages');
            updateMessages(prev => {
              const combined = [...syncedMessages, ...prev];
              return deduplicateMessages(combined);
            });
          }
        }
        
        // Handle synced reactions if needed
        if (data.reactions) {
          console.log('🔄 Synced reactions:', data.reactions.length);
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
        console.log('📋 Sync data that caused error:', data);
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
  }, [channelId, currentUser, deduplicateMessages, updateMessages]);

  // Load initial messages when channel changes
  useEffect(() => {
    const loadKey = `${channelId}-channel`;
    
    if (loadedRef.current !== loadKey && loadMessagesRef.current) {
      // Reset state for new channel
      setMessages([]);
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
    optimisticMessages,
    failedMessages,
    editingMessages,
    deletingMessages,
  };
};