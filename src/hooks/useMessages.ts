import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useToast } from '../contexts/ToastContext';
import { RootState } from '../store/store';
import type { Message, TypingUser, ThreadInfo } from '../types/message';
import { messageService } from '../services/messageService';
import unifiedWebSocketService from '../services/unifiedWebSocketService';

interface SendMessageParams {
  content: string;
  type: 'text' | 'image' | 'file' | 'voice';
  threadRootId?: string;
  replyTo?: {
    id: string;
    content: string;
    sender: any;
  };
  attachments?: any[];
}

export const useMessages = (channelId: string, threadRootId?: string) => {
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
  
  // Enhanced thread state management
  const [threadCache, setThreadCache] = useState<Map<string, Message[]>>(new Map());
  const [threadInfoCache, setThreadInfoCache] = useState<Map<string, ThreadInfo>>(new Map());
  const [activeThreads, setActiveThreads] = useState<Set<string>>(new Set());
  const [threadLoadingStates, setThreadLoadingStates] = useState<Map<string, boolean>>(new Map());

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
          messageMap.set(msg.id, msg);
          console.log('🔄 Resolved conflict: replaced optimistic with real message');
        }
        return;
      }
      
      seen.add(msg.id);
      messageMap.set(msg.id, msg);
    });
    
    return Array.from(messageMap.values());
  }, []);

  // Message cache management for better performance
  const updateMessageCache = useCallback((newMessages: Message[]) => {
    setMessageCache(prev => {
      const updated = new Map(prev);
      newMessages.forEach(msg => {
        // Only update if message is newer or doesn't exist
        const existing = updated.get(msg.id);
        if (!existing || new Date(msg.timestamp) >= new Date(existing.timestamp)) {
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

  // Helper function to transform API message to frontend format
  // This is a pure transformation function with no external dependencies
  const transformApiMessage = useCallback((apiMessage: any): Message => {
    if (!apiMessage) {
      throw new Error('Invalid API message: null or undefined');
    }
    
    return {
    id: apiMessage.id,
    content: apiMessage.content,
    sender: {
      id: apiMessage.user_details?.id || apiMessage.user_id,
      name: apiMessage.user_details?.name || 'Unknown User',
      email: apiMessage.user_details?.email || '',
      avatar: apiMessage.user_details?.avatar_url || apiMessage.user_details?.avatar || '',
      role: apiMessage.user_details?.role || 'member',
      isOnline: true,
    },
    user_details: apiMessage.user_details,
    channelId: apiMessage.channel_id,
    timestamp: apiMessage.created_at ? new Date(apiMessage.created_at) : new Date(),
    type: apiMessage.message_type || 'text',
    threadRootId: apiMessage.thread_root_id,
    reactions: Array.isArray(apiMessage.reactions) ? apiMessage.reactions : [],
    attachments: Array.isArray(apiMessage.attachments) ? apiMessage.attachments : [],
    replyTo: apiMessage.reply_to_id ? {
      id: apiMessage.reply_to_id,
      content: apiMessage.reply_to?.content || '',
      sender: apiMessage.reply_to?.sender || { id: '', name: 'Unknown' },
    } : undefined,
    isOptimistic: false,
    isThreadRoot: apiMessage.is_thread_root || !!apiMessage.thread_info,
    threadInfo: apiMessage.thread_info ? {
      replyCount: apiMessage.thread_info.reply_count || apiMessage.reply_count || 0,
      lastReplyAt: (apiMessage.thread_info.last_reply_at || apiMessage.last_reply_timestamp) ? 
        new Date(apiMessage.thread_info.last_reply_at || apiMessage.last_reply_timestamp) : undefined,
      lastReplyBy: apiMessage.thread_info.last_reply_by_details,
      participants: apiMessage.thread_info.participant_details || [],
    } : (apiMessage.reply_count > 0 ? {
      replyCount: apiMessage.reply_count,
      lastReplyAt: apiMessage.last_reply_timestamp ? new Date(apiMessage.last_reply_timestamp) : undefined,
      lastReplyBy: undefined,
      participants: [],
    } : undefined),
    isEdited: apiMessage.is_edited,
    editedAt: apiMessage.edited_at ? new Date(apiMessage.edited_at) : undefined,
    isDeleted: !!apiMessage.deleted_at,
    };
  }, []); // No dependencies - pure transformation function


  const loadMessages = useCallback(async () => {
    const loadKey = `${channelId}-${threadRootId || 'channel'}`;
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
      if (threadRootId) {
        console.log('🧵 Loading thread replies for:', threadRootId);
        const response = await messageService.getThreadReplies(threadRootId, {
          limit: 50,
          offset: 0,
        });
        
        console.log('🧵 Thread replies response:', response);
        
        // Check if operation was aborted
        if (signal.aborted || !isMountedRef.current) return;
        
        if (response.success) {
          // Handle empty replies array gracefully
          const replies = response.data?.replies || [];
          const transformedMessages = replies.map(transformApiMessage);
          console.log('✅ Thread replies transformed:', transformedMessages.length, 'messages');
          
          // Double-check component is still mounted before updating state
          if (isMountedRef.current) {
            // Sort messages by timestamp (oldest first)
            const sortedMessages = transformedMessages.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            setMessages(deduplicateMessages(sortedMessages));
            const pagination = response.data?.pagination || { has_more: false, total: 0, next_cursor: null };
            setHasMoreMessages(pagination.has_more || false);
            
            // Initialize pagination state for thread
            setPagination({
              offset: transformedMessages.length,
              limit: 20,
              total: pagination.total || 0,
              hasMore: pagination.has_more || false,
              nextCursor: pagination.next_cursor || null,
              isInitialLoad: false,
            });
            
            loadedRef.current = loadKey;
          }
        } else {
          console.error('❌ Thread replies response not successful:', response);
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
      } else {
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
          const transformedMessages = messagesArray.map(transformApiMessage);
          console.log('✅ Channel messages transformed:', transformedMessages.length, 'messages');
          
          // Double-check component is still mounted before updating state
          if (isMountedRef.current) {
            // Sort messages by timestamp (oldest first)
            const sortedMessages = transformedMessages.sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            setMessages(deduplicateMessages(sortedMessages));
            const paginationData = response.pagination || { hasMore: false, has_more: false, total: 0, next_cursor: null, nextCursor: null };
            setHasMoreMessages(paginationData.hasMore || paginationData.has_more || false);
            
            // Initialize pagination state for channel
            setPagination({
              offset: transformedMessages.length,
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
      }
    } catch (err: any) {
      console.error('💥 Load messages error:', {
        error: err,
        message: err.message,
        stack: err.stack,
        name: err.name,
        channelId,
        threadRootId,
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
  }, [channelId, threadRootId]);

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
    const requestKey = `loadMore-${channelId}-${threadRootId || 'channel'}-${pagination.offset}-${pagination.nextCursor || 'none'}`;
    if (pendingRequestsRef.current.has(requestKey)) {
      console.log('🔄 Skipping duplicate loadMore request:', requestKey);
      return;
    }

    pendingRequestsRef.current.add(requestKey);
    setIsLoadingMore(true);
    
    console.log('📄 Loading more messages:', {
      currentOffset: pagination.offset,
      currentCount: messages.length,
      nextCursor: pagination.nextCursor,
      threadRootId
    });

    try {
      const requestOptions = {
        limit: pagination.limit,
        offset: pagination.offset,
        ...(pagination.nextCursor && { cursor: pagination.nextCursor }),
      };
      
      let response;
      
      if (threadRootId) {
        // Load more thread replies
        response = await messageService.getThreadReplies(threadRootId, requestOptions);
        
        if (response.success && isMountedRef.current) {
          // Handle empty replies array gracefully
          const replies = response.data?.replies || [];
          const transformedMessages = replies.map(transformApiMessage);
          console.log('🧵 Loaded', transformedMessages.length, 'more thread replies');
          
          // Smart message merging to prevent duplicates
          updateMessages(prev => [...prev, ...transformedMessages]);
          
          // Update pagination state
          const pagination = response.data?.pagination || { has_more: false, next_cursor: null, total: 0 };
          setPagination(prev => ({
            ...prev,
            offset: prev.offset + transformedMessages.length,
            hasMore: pagination.has_more || false,
            nextCursor: pagination.next_cursor || null,
            total: pagination.total || prev.total,
          }));
          
          setHasMoreMessages(pagination.has_more || false);
        }
      } else {
        // Load more channel messages
        response = await messageService.getChannelMessages(channelId, requestOptions);
        
        if (response.success && isMountedRef.current) {
          // Handle empty messages array gracefully
          const messagesArray = Array.isArray(response.data) ? response.data : [];
          const transformedMessages = messagesArray.map(transformApiMessage);
          console.log('📨 Loaded', transformedMessages.length, 'more channel messages');
          
          // Smart message merging to prevent duplicates
          updateMessages(prev => [...prev, ...transformedMessages]);
          
          // Update pagination state
          const paginationData = response.pagination || { hasMore: false, has_more: false, total: 0, next_cursor: null, nextCursor: null };
          setPagination(prev => ({
            ...prev,
            offset: prev.offset + transformedMessages.length,
            hasMore: paginationData.hasMore || paginationData.has_more || false,
            nextCursor: (paginationData as any).next_cursor || (paginationData as any).nextCursor || null,
            total: paginationData.total || prev.total,
          }));
          
          setHasMoreMessages(paginationData.hasMore || paginationData.has_more || false);
        }
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
    threadRootId, 
    messages.length, 
    showError, 
    transformApiMessage,
    updateMessages
  ]);

  const sendMessage = useCallback(async (params: SendMessageParams, retryCount = 0) => {
    const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Create optimistic message for immediate UI feedback
    const optimisticMessage: Message = {
      id: optimisticId,
      content: params.content,
      sender: {
        id: currentUser?.id || 'current-user',
        name: currentUser?.name || 'Current User',
        email: currentUser?.email || '',
        avatar: currentUser?.avatar_url || '',
        role: currentUser?.role || 'member',
        isOnline: true,
      },
      channelId,
      timestamp: new Date(),
      type: params.type,
      threadRootId: params.threadRootId,
      reactions: [],
      attachments: params.attachments || [],
      replyTo: params.replyTo,
      isOptimistic: true,
      isSending: true,
    };

    // Track optimistic message
    setOptimisticMessages(prev => new Set([...prev, optimisticId]));

    // Add optimistic message
    updateMessages(prev => [optimisticMessage, ...prev]);

    console.log('📤 Sending message optimistically:', optimisticId);

    try {
      let response;
      
      if (threadRootId) {
        // Send as thread reply using the correct endpoint: POST /channels/{channelId}/messages/{messageId}/thread
        response = await messageService.addThreadReply(channelId, threadRootId, {
          content: params.content,
          message_type: params.type === 'image' ? 'file' : params.type,
          reply_to_id: params.replyTo?.id,
          attachments: params.attachments?.map(att => ({
            file_id: att.id,
            filename: att.name,
            file_type: att.type,
            file_size: att.size || 0,
          })),
        });
      } else {
        // Send as channel message  
        response = await messageService.sendMessage(channelId, {
          content: params.content,
          message_type: params.type === 'image' ? 'file' : (params.type as 'text' | 'voice' | 'file' | 'system'),
          reply_to_id: params.replyTo?.id,
          thread_root_id: params.threadRootId,
          attachments: params.attachments?.map(att => ({
            file_id: att.id,
            filename: att.name,
            file_type: att.type,
            file_size: att.size || 0,
          })),
        });
      }

      if (response.success && response.data) {
        // Replace optimistic message with real message from API
        const realMessage = transformApiMessage(response.data);
        
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
        // Return a basic message object since we can't access the current messages array here
        return {
          id: optimisticId,
          content: params.content,
          sender: {
            id: currentUser?.id || 'current-user',
            name: currentUser?.name || 'Current User',
            email: currentUser?.email || '',
            avatar: currentUser?.avatar_url || '',
            role: currentUser?.role || 'member',
            isOnline: true,
          },
          channelId,
          timestamp: new Date(),
          type: params.type,
          threadRootId: params.threadRootId,
          reactions: [],
          attachments: params.attachments || [],
          replyTo: params.replyTo,
          isOptimistic: false,
          isSending: false,
        };
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
      setFailedMessages(prev => new Set([...prev, optimisticId]));
      
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
  }, [showSuccess, showError, currentUser, channelId, threadRootId, updateMessages, updateMessageCache, transformApiMessage]);

  const editMessage = useCallback(async (messageId: string, content: string, retryCount = 0) => {
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
    setEditingMessages(prev => new Set([...prev, messageId]));

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
      const response = await messageService.editMessage(messageId, content);
      
      if (response.success && response.data) {
        // Update with real data from API
        const updatedMessage = transformApiMessage(response.data);
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
      setFailedMessages(prev => new Set([...prev, messageId]));
      
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
  }, [messages, editingMessages, updateMessages, updateMessageCache, showSuccess, showError, transformApiMessage]);

  const deleteMessage = useCallback(async (messageId: string, retryCount = 0) => {
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
    setDeletingMessages(prev => new Set([...prev, messageId]));

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
      const response = await messageService.deleteMessage(messageId);
      
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
      setFailedMessages(prev => new Set([...prev, messageId]));
      
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


  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    const currentUserId = currentUser?.id || 'current-user';
    const originalMessage = messages.find(m => m.id === messageId);
    if (!originalMessage) return;
    
    // Optimistically update UI
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;

      const existingReaction = msg.reactions.find(r => r.emoji === emoji);
      const userAlreadyReacted = existingReaction?.users.some(u => u.id === currentUserId);

      if (userAlreadyReacted) {
        // Remove user's reaction
        return {
          ...msg,
          reactions: msg.reactions.map(r => 
            r.emoji === emoji
              ? {
                  ...r,
                  users: r.users.filter(u => u.id !== currentUserId),
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
            reactions: msg.reactions.map(r => 
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
            reactions: [...msg.reactions, {
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
      const response = await messageService.toggleReaction(messageId, emoji);
      
      if (response.success) {
        // Update with real reaction data from API
        const updatedReactions = response.data.current_reactions.map((r: any) => ({
          emoji: r.emoji,
          count: r.count,
          users: r.users.map((u: any) => ({
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
      console.error('Failed to toggle reaction:', err);
      // Revert on error
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? originalMessage : msg
      ));
    }
  }, [currentUser, messages]);

  // Enhanced thread management with proper state handling
  const createThread = useCallback(async (messageId: string) => {
    // Optimistically mark as thread root
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            isThreadRoot: true, 
            threadInfo: { replyCount: 0, participants: [] }
          }
        : msg
    ));
    
    // Track active thread
    setActiveThreads(prev => new Set([...prev, messageId]));
    
    try {
      const response = await messageService.createThread(messageId);
      
      if (response.success && response.data) {
        const threadInfo: ThreadInfo = {
          replyCount: response.data.reply_count || 0,
          lastReplyAt: response.data.last_reply_at ? new Date(response.data.last_reply_at) : undefined,
          lastReplyBy: response.data.last_reply_by_details,
          participants: response.data.participant_details || [],
        };
        
        // Update thread info cache
        setThreadInfoCache(prev => new Map([...prev, [messageId, threadInfo]]));
        
        // Update message with real thread info from API
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isThreadRoot: true, threadInfo }
            : msg
        ));
        
        console.log('✅ Thread created successfully:', messageId);
        return threadInfo;
      } else {
        throw new Error((response as any).error?.message || 'Failed to create thread');
      }
    } catch (err: any) {
      console.error('❌ Failed to create thread:', err);
      
      // Show user-friendly error message
      const errorMessage = err.error?.message || err.message || 'Failed to create thread';
      showError(`Failed to create thread: ${errorMessage}`);
      
      // Revert optimistic update on error
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isThreadRoot: false, threadInfo: undefined }
          : msg
      ));
      
      setActiveThreads(prev => {
        const updated = new Set(prev);
        updated.delete(messageId);
        return updated;
      });
      
      throw err;
    }
  }, [showError]);

  // Enhanced thread info management with cache synchronization
  const updateThreadInfo = useCallback((messageId: string, newReply: Message | any) => {
    const replyUser = newReply.sender || newReply.user_details;
    
    // Update thread info cache
    setThreadInfoCache(prev => {
      const currentInfo = prev.get(messageId);
      if (!currentInfo) return prev;
      
      const currentParticipants = currentInfo.participants || [];
      const isNewParticipant = !currentParticipants.some(p => p.id === replyUser?.id);
      
      const updatedInfo: ThreadInfo = {
        replyCount: currentInfo.replyCount + 1,
        lastReplyAt: new Date(),
        lastReplyBy: replyUser,
        participants: isNewParticipant && replyUser
          ? [...currentParticipants, replyUser]
          : currentParticipants,
      };
      
      return new Map([...prev, [messageId, updatedInfo]]);
    });
    
    // Update message thread info
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId || !msg.isThreadRoot) return msg;
      
      const currentParticipants = msg.threadInfo?.participants || [];
      const isNewParticipant = !currentParticipants.some(p => p.id === replyUser?.id);
      
      return {
        ...msg,
        threadInfo: {
          replyCount: (msg.threadInfo?.replyCount || 0) + 1,
          lastReplyAt: new Date(),
          lastReplyBy: replyUser,
          participants: isNewParticipant && replyUser
            ? [...currentParticipants, replyUser]
            : currentParticipants,
        },
      };
    }));
  }, []);

  // Enhanced typing indicators with debouncing and proper cleanup
  const startTyping = useCallback(() => {
    const now = Date.now();
    
    // Debounce typing events - only send if last typing was more than 1 second ago
    if (now - lastTypingTimestampRef.current < 1000) {
      return;
    }
    
    lastTypingTimestampRef.current = now;
    unifiedWebSocketService.startTyping(channelId, threadRootId);

    // Clear existing timeout
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingDebounceRef.current = setTimeout(() => {
      unifiedWebSocketService.stopTyping(channelId, threadRootId);
    }, 3000);
  }, [channelId, threadRootId]);

  const stopTyping = useCallback(() => {
    unifiedWebSocketService.stopTyping(channelId, threadRootId);

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
  }, [channelId, threadRootId]);

  // Enhanced WebSocket event handlers with sync support
  useEffect(() => {
    // Connect to WebSocket with enhanced error handling
    const connectWebSocket = async () => {
      try {
        await unifiedWebSocketService.connect();
        console.log('✅ WebSocket connected for channel:', channelId);
      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
        setError('Failed to establish real-time connection. Some features may not work properly.');
      }
    };

    connectWebSocket();

    // Join channel for real-time updates
    unifiedWebSocketService.joinChannel(channelId);

    // Message events
    const handleMessageSent = (data: any) => {
      if (data.channelId === channelId) {
        // Validate that message data exists and is not null/undefined
        if (!data.message) {
          console.warn('🚨 Received message_sent event with null/undefined message data:', data);
          return;
        }
        
        try {
          if (threadRootId && data.threadRootId === threadRootId) {
            // New reply in current thread
            const newMessage = transformApiMessage(data.message);
            setMessages(prev => deduplicateMessages([...prev, newMessage]));
          } else if (!threadRootId && !data.isThreadReply) {
            // New message in current channel (not a thread reply)
            const newMessage = transformApiMessage(data.message);
            setMessages(prev => deduplicateMessages([...prev, newMessage]));
          }
        } catch (error) {
          console.error('❌ Error processing message_sent event:', error);
          console.log('📋 Message data that caused error:', data);
        }
      }
    };

    const handleMessageUpdated = (data: any) => {
      if (data.channelId === channelId) {
        // Validate that message data exists and is not null/undefined
        if (!data.message) {
          console.warn('🚨 Received message_updated event with null/undefined message data:', data);
          return;
        }
        
        try {
          const updatedMessage = transformApiMessage(data.message);
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId ? updatedMessage : msg
          ));
        } catch (error) {
          console.error('❌ Error processing message_updated event:', error);
          console.log('📋 Message data that caused error:', data);
        }
      }
    };

    const handleMessageDeleted = (data: any) => {
      if (data.channelId === channelId) {
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      }
    };

    // Enhanced thread event handling
    const handleThreadCreated = (data: any) => {
      if (data.channelId === channelId) {
        const threadInfo: ThreadInfo = {
          replyCount: data.reply_count || 0,
          participants: data.participant_details || [],
          lastReplyAt: data.last_reply_at ? new Date(data.last_reply_at) : undefined,
          lastReplyBy: data.last_reply_by_details,
        };
        
        // Update thread info cache
        setThreadInfoCache(prev => new Map([...prev, [data.threadRootId, threadInfo]]));
        setActiveThreads(prev => new Set([...prev, data.threadRootId]));
        
        // Update message state
        setMessages(prev => prev.map(msg => 
          msg.id === data.threadRootId 
            ? { ...msg, isThreadRoot: true, threadInfo }
            : msg
        ));
        
        console.log('🧵 Thread created via WebSocket:', data.threadRootId);
      }
    };

    const handleThreadReply = (data: any) => {
      if (data.channelId === channelId) {
        const replyMessage = data.reply || data.message;
        
        // Validate that reply message data exists and is not null/undefined
        if (!replyMessage) {
          console.warn('🚨 Received thread_reply event with null/undefined reply data:', data);
          return;
        }
        
        try {
          if (threadRootId && data.threadRootId === threadRootId) {
            // Add reply to current thread view
            const newMessage = transformApiMessage(replyMessage);
            setMessages(prev => deduplicateMessages([newMessage, ...prev]));
          } else if (!threadRootId) {
            // Update thread info in channel view
            updateThreadInfo(data.threadRootId, replyMessage);
          }
          
          console.log('💬 Thread reply received:', {
            threadRootId: data.threadRootId,
            currentThread: threadRootId,
            isCurrentThread: threadRootId === data.threadRootId
          });
        } catch (error) {
          console.error('❌ Error processing thread_reply event:', error);
          console.log('📋 Reply data that caused error:', data);
        }
      }
    };

    // Reaction events
    const handleReactionToggled = (data: any) => {
      const updatedReactions = data.currentReactions.map((r: any) => ({
        emoji: r.emoji,
        count: r.count,
        users: r.users.map((u: any) => ({
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

    const handleReactionsCleared = (data: any) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: [] }
          : msg
      ));
    };

    // Enhanced typing indicators with proper user management
    const handleTypingIndicator = (data: any) => {
      if (data.channelId === channelId && data.threadRootId === threadRootId) {
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
    unifiedWebSocketService.on('message_sent', handleMessageSent);
    unifiedWebSocketService.on('message_updated', handleMessageUpdated);
    unifiedWebSocketService.on('message_deleted', handleMessageDeleted);
    unifiedWebSocketService.on('thread_created', handleThreadCreated);
    unifiedWebSocketService.on('thread_reply', handleThreadReply);
    unifiedWebSocketService.on('reaction_toggled', handleReactionToggled);
    unifiedWebSocketService.on('reactions_cleared', handleReactionsCleared);
    unifiedWebSocketService.on('typing_indicator', handleTypingIndicator);
    
    // Enhanced connection state handling
    const handleConnectionStateChange = () => {
      const connectionState = unifiedWebSocketService.getConnectionState();
      console.log('📶 WebSocket connection state changed:', connectionState);

      if (connectionState === 'connected') {
        setError(null); // Clear any connection errors
      } else if (connectionState === 'reconnecting') {
        setError('Reconnecting to server...');
      } else if (connectionState === 'disconnected') {
        const reconnectionInfo = unifiedWebSocketService.getReconnectionInfo();
        if (reconnectionInfo.attempts >= reconnectionInfo.maxAttempts) {
          setError('Connection lost. Please refresh the page to reconnect.');
        }
      }
    };
    
    const handleMaxReconnectAttemptsReached = () => {
      setError('Connection lost. Please check your internet connection and refresh the page.');
    };
    
    const handleSyncResponse = (data: { messages: any[]; reactions: any[]; threads: any[] }) => {
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
              
              // Only process messages for current channel/thread
              if (threadRootId) {
                return msg.thread_root_id === threadRootId;
              } else {
                return msg.channel_id === channelId && !msg.thread_root_id;
              }
            })
            .map(msg => {
              try {
                return transformApiMessage(msg);
              } catch (error) {
                console.error('❌ Error transforming synced message:', error);
                console.log('📋 Message that caused error:', msg);
                return null;
              }
            })
            .filter(msg => msg !== null); // Remove any failed transformations
          
          if (syncedMessages.length > 0) {
            console.log('✅ Synced', syncedMessages.length, 'messages');
            updateMessages(prev => {
              const combined = [...syncedMessages, ...prev];
              return deduplicateMessages(combined);
            });
          }
        }
        
        // Handle synced reactions and threads if needed
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
    unifiedWebSocketService.on('connect', handleConnectionStateChange);
    unifiedWebSocketService.on('disconnect', handleConnectionStateChange);
    unifiedWebSocketService.on('max_reconnect_attempts_reached', handleMaxReconnectAttemptsReached);
    unifiedWebSocketService.on('sync_response', handleSyncResponse);

    return () => {
      // Cleanup event listeners
      unifiedWebSocketService.off('message_sent', handleMessageSent);
      unifiedWebSocketService.off('message_updated', handleMessageUpdated);
      unifiedWebSocketService.off('message_deleted', handleMessageDeleted);
      unifiedWebSocketService.off('thread_created', handleThreadCreated);
      unifiedWebSocketService.off('thread_reply', handleThreadReply);
      unifiedWebSocketService.off('reaction_toggled', handleReactionToggled);
      unifiedWebSocketService.off('reactions_cleared', handleReactionsCleared);
      unifiedWebSocketService.off('typing_indicator', handleTypingIndicator);
      unifiedWebSocketService.off('connect', handleConnectionStateChange);
      unifiedWebSocketService.off('disconnect', handleConnectionStateChange);
      unifiedWebSocketService.off('max_reconnect_attempts_reached', handleMaxReconnectAttemptsReached);
      unifiedWebSocketService.off('sync_response', handleSyncResponse);

      // Leave channel
      unifiedWebSocketService.leaveChannel(channelId);
    };
  }, [channelId, threadRootId]); // Removed transformApiMessage - it's now stable

  // Load initial messages when channel/thread changes
  useEffect(() => {
    const loadKey = `${channelId}-${threadRootId || 'channel'}`;
    
    if (loadedRef.current !== loadKey && loadMessagesRef.current) {
      // Reset state for new channel/thread
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
  }, [channelId, threadRootId]); // Only depend on channelId and threadRootId

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
      await unifiedWebSocketService.forceReconnect();
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
    createThread,
    updateThreadInfo,
    forceReconnect,
    // Connection state
    connectionState: unifiedWebSocketService.getConnectionState(),
    reconnectionInfo: unifiedWebSocketService.getReconnectionInfo(),
    isConnected: unifiedWebSocketService.isConnected(),
    // Thread state getters
    threadCache,
    threadInfoCache,
    activeThreads,
    // Message state getters
    optimisticMessages,
    failedMessages,
    editingMessages,
    deletingMessages,
  };
};