import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { channelService } from '../services/api/channelService';
import type { ChannelSummary } from '../types/chat';

export interface ChannelState {
  // Modals and UI state
  showSummaryModal: boolean;
  showKeyPointsModal: boolean;
  showTaskIntegration: boolean;
  channelSummary: ChannelSummary | null;
  isGeneratingSummary: boolean;
  isCreatingTasks: boolean;

  // Channel info
  channelStats: {
    messageCount: number;
    fileCount: number;
  };
  actualChannelMembers: any[];
  isLoadingMembers: boolean;
  error: string | null;
}

export interface ChannelActions {
  // Modal controls
  setShowSummaryModal: (show: boolean) => void;
  setShowKeyPointsModal: (show: boolean) => void;
  setShowTaskIntegration: (show: boolean) => void;
  
  // Channel operations
  loadChannelInfo: () => Promise<void>;
  generateSummary: () => Promise<void>;
  retryChannelInfo: () => Promise<void>;
  clearError: () => void;
}

export const useChannelState = (channelId: string): [ChannelState, ChannelActions] => {
  // Component lifecycle tracking
  const isMountedRef = useRef(true);
  const summaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showKeyPointsModal, setShowKeyPointsModal] = useState(false);
  const [showTaskIntegration, setShowTaskIntegration] = useState(false);
  const [channelSummary, setChannelSummary] = useState<ChannelSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isCreatingTasks] = useState(false);

  // Channel state
  const [channelStats, setChannelStats] = useState({
    messageCount: 0,
    fileCount: 0,
  });
  const [actualChannelMembers, setActualChannelMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load channel information including stats and members
  const loadChannelInfo = useCallback(async () => {
    if (!channelId || !isMountedRef.current) return;

    console.log('Loading channel info for:', channelId);
    setIsLoadingMembers(true);
    setError(null);

    try {
      // Use the single channel endpoint that includes member_details
      const channel = await channelService.getChannel(channelId);
      console.log('Channel info received:', channel);
      
      // Only update state if component is still mounted
      if (!isMountedRef.current) return;
      
      // Set channel stats (these may need to be fetched separately)
      setChannelStats({
        messageCount: (channel as any).message_count || 0,
        fileCount: (channel as any).file_count || 0,
      });
      
      // Set members from member_details (if available)
      if ((channel as any).member_details && Array.isArray((channel as any).member_details)) {
        setActualChannelMembers((channel as any).member_details);
      }
      
      // Clear error on successful load
      setError(null);
      
    } catch (error: any) {
      console.error('Error loading channel info:', error);
      
      if (isMountedRef.current) {
        // Provide more specific error messages based on error type
        let errorMessage = 'Failed to load channel information';
        
        if (error?.message?.includes('timed out') || error?.code === 'TIMEOUT') {
          errorMessage = 'Connection timed out. Please check your network and try again.';
        } else if (error?.message?.includes('Network request failed')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error?.statusCode === 403) {
          errorMessage = 'You don\'t have permission to view this channel.';
        } else if (error?.statusCode === 404) {
          errorMessage = 'Channel not found.';
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMembers(false);
      }
    }
  }, [channelId]);

  // Generate channel summary
  const generateSummary = useCallback(async () => {
    if (!channelId || isGeneratingSummary || !isMountedRef.current) return;
    
    setIsGeneratingSummary(true);
    setError(null);
    
    try {
      // Clear any existing timeout
      if (summaryTimeoutRef.current) {
        clearTimeout(summaryTimeoutRef.current);
      }
      
      // Simulate API call for summary generation with proper cleanup
      await new Promise<void>((resolve) => {
        summaryTimeoutRef.current = setTimeout(() => {
          summaryTimeoutRef.current = null;
          if (isMountedRef.current) {
            resolve();
          }
        }, 2000);
      });
      
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;
      
      // TODO: Implement actual channel summary generation when backend is ready
      // For now, summary functionality is disabled
    } catch (error) {
      console.error('Error generating summary:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to generate summary');
      }
    } finally {
      if (isMountedRef.current) {
        setIsGeneratingSummary(false);
      }
    }
  }, [channelId, isGeneratingSummary]);

  // Retry function that clears pending requests and tries again
  const retryChannelInfo = useCallback(async () => {
    // Clear any pending requests to avoid cache issues
    channelService.clearPendingRequests();
    await loadChannelInfo();
  }, [loadChannelInfo]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load initial channel data on mount
  useEffect(() => {
    if (channelId) {
      loadChannelInfo();
    }
  }, [channelId]); // Remove loadChannelInfo from dependencies to prevent infinite loop
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Clear any pending timeouts
      if (summaryTimeoutRef.current) {
        clearTimeout(summaryTimeoutRef.current);
        summaryTimeoutRef.current = null;
      }
    };
  }, []);

  // Memoized state object for performance
  const state: ChannelState = useMemo(() => ({
    // Modals and UI state
    showSummaryModal,
    showKeyPointsModal,
    showTaskIntegration,
    channelSummary,
    isGeneratingSummary,
    isCreatingTasks,
    
    // Channel state
    channelStats,
    actualChannelMembers,
    isLoadingMembers,
    error,
  }), [
    showSummaryModal,
    showKeyPointsModal,
    showTaskIntegration,
    channelSummary,
    isGeneratingSummary,
    isCreatingTasks,
    channelStats,
    actualChannelMembers,
    isLoadingMembers,
    error,
  ]);
  
  // Memoized actions object for performance
  const actions: ChannelActions = useMemo(() => ({
    // Modal actions
    setShowSummaryModal,
    setShowKeyPointsModal,
    setShowTaskIntegration,
    
    // Channel operations
    loadChannelInfo,
    generateSummary,
    retryChannelInfo,
    clearError,
  }), [loadChannelInfo, generateSummary, retryChannelInfo, clearError]);

  return [state, actions];
};