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
}

export interface ChannelActions {
  // Modal controls
  setShowSummaryModal: (show: boolean) => void;
  setShowKeyPointsModal: (show: boolean) => void;
  setShowTaskIntegration: (show: boolean) => void;
  
  // Channel operations
  loadChannelInfo: () => Promise<void>;
  generateSummary: () => Promise<void>;
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
    } catch (error) {
      console.error('Error loading channel info:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to load channel information');
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
      
      // Mock summary data - will be replaced with real API when messages are implemented
      const mockSummary: ChannelSummary = {
        id: `summary_${Date.now()}`,
        title: 'Channel Discussion Summary',
        keyPoints: [
          'Channel summary will be available when messages are implemented',
        ],
        decisions: [],
        actionItems: [],
        participants: [],
        duration: '2 hours',
        generatedAt: new Date(),
      };
      
      setChannelSummary(mockSummary);
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
  ]);
  
  // Memoized actions object for performance
  const actions: ChannelActions = useMemo(() => ({
    // Modal actions
    setShowSummaryModal,
    setShowKeyPointsModal,
    setShowTaskIntegration,
    generateSummary,
    loadChannelInfo,
  }), [generateSummary, loadChannelInfo]);

  return [state, actions];
};