import React, { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '../../services/websocketService';

interface ChannelTypingManagerProps {
  channelId: string;
  currentUserId?: string;
  onTypingChange: (typingUsers: Array<{
    userId: string;
    userName: string;
    isTyping: boolean;
  }>) => void;
  children: React.ReactNode;
}

export const ChannelTypingManager: React.FC<ChannelTypingManagerProps> = ({
  channelId,
  currentUserId = 'current_user',
  onTypingChange,
  children,
}) => {
  const { 
    isConnected, 
    on, 
    off, 
    startChannelTyping, 
    stopChannelTyping, 
    startChannelReplyTyping, 
    stopChannelReplyTyping 
  } = useWebSocket();
  const [typingUsers, setTypingUsers] = useState<Array<{
    userId: string;
    userName: string;
    isTyping: boolean;
    timestamp: number;
  }>>([]);
  
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isTypingRef = useRef(false);
  const lastTypingEmit = useRef(0);

  // Clean up typing timeouts
  useEffect(() => {
    const timeouts = typingTimeoutRef.current;
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  // Listen for typing events
  useEffect(() => {
    if (!isConnected) return;

    const handleTypingStart = (event: {
      channelId: string;
      userId: string;
      userName: string;
      timestamp: string;
    }) => {
      if (event.channelId !== channelId || event.userId === currentUserId) return;

      setTypingUsers(prev => {
        const existing = prev.find(u => u.userId === event.userId);
        const timeouts = typingTimeoutRef.current;
        
        // Clear existing timeout for this user
        const existingTimeout = timeouts.get(event.userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout to stop typing after 3 seconds
        const timeout = setTimeout(() => {
          setTypingUsers(current => 
            current.map(u => 
              u.userId === event.userId 
                ? { ...u, isTyping: false }
                : u
            )
          );
          timeouts.delete(event.userId);
        }, 3000);
        
        timeouts.set(event.userId, timeout);

        if (existing) {
          return prev.map(u => 
            u.userId === event.userId 
              ? { ...u, isTyping: true, timestamp: Date.now() }
              : u
          );
        } else {
          return [...prev, {
            userId: event.userId,
            userName: event.userName,
            isTyping: true,
            timestamp: Date.now(),
          }];
        }
      });
    };

    const handleTypingStop = (event: {
      channelId: string;
      userId: string;
      userName: string;
      timestamp: string;
    }) => {
      if (event.channelId !== channelId || event.userId === currentUserId) return;

      setTypingUsers(prev => 
        prev.map(u => 
          u.userId === event.userId 
            ? { ...u, isTyping: false }
            : u
        )
      );

      // Clear timeout for this user
      const timeouts = typingTimeoutRef.current;
      const existingTimeout = timeouts.get(event.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        timeouts.delete(event.userId);
      }
    };

    const unsubscribeStart = on('channel_typing_start', handleTypingStart);
    const unsubscribeStop = on('channel_typing_stop', handleTypingStop);

    return () => {
      unsubscribeStart();
      unsubscribeStop();
    };
  }, [isConnected, channelId, currentUserId, on]);

  // Notify parent of typing changes
  useEffect(() => {
    onTypingChange(typingUsers);
  }, [typingUsers, onTypingChange]);

  // Public methods for managing typing state
  const startTyping = () => {
    if (!isConnected || isTypingRef.current) return;
    
    const now = Date.now();
    // Throttle typing events to avoid spam (max once per second)
    if (now - lastTypingEmit.current < 1000) return;

    isTypingRef.current = true;
    lastTypingEmit.current = now;
    
    startChannelTyping(channelId);

    // Auto-stop typing after 3 seconds if not stopped manually
    setTimeout(() => {
      if (isTypingRef.current) {
        stopTyping();
      }
    }, 3000);
  };

  const stopTyping = () => {
    if (!isConnected || !isTypingRef.current) return;

    isTypingRef.current = false;
    stopChannelTyping(channelId);
  };

  const startReplyTyping = (parentMessageId: string, parentUserName: string) => {
    if (!isConnected) return;
    startChannelReplyTyping(channelId, parentMessageId, parentUserName);
  };

  const stopReplyTyping = (parentMessageId: string) => {
    if (!isConnected) return;
    stopChannelReplyTyping(channelId, parentMessageId);
  };

  // Provide typing methods to children via React Context or props
  return (
    <>
      {React.cloneElement(children as React.ReactElement, {
        onStartTyping: startTyping,
        onStopTyping: stopTyping,
        onStartReplyTyping: startReplyTyping,
        onStopReplyTyping: stopReplyTyping,
      })}
    </>
  );
};