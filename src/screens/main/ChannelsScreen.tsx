import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Feather from 'react-native-vector-icons/Feather';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { useToast } from '../../contexts/ToastContext';
import { channelService, type Channel as ApiChannel, type ChannelCategory } from '../../services/api/channelService';
import { userService } from '../../services/api/userService';
import { AuthError } from '../../services/api/authService';
import { useAuth } from '../../hooks/useAuth';
import { useAuthorization } from '../../contexts/AuthorizationContext';
import { ChannelCard, ConfirmationModal, ActionSheet } from '../../components/common';
import { CreateChannelModal } from '../../components/channel/CreateChannelModal';
import { MemberSelectorModal } from '../../components/channel/MemberSelectorModal';
import { CategoryFilterModal } from '../../components/channel/CategoryFilterModal';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { useWebSocket } from '../../services/websocketService';
import { Channel } from '../../types/project';

// Create animated components
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email?: string;
  department?: string;
  job_title?: string;
}

interface DisplayChannel {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  members: Member[];
  memberAvatars: string[];
  messages: number;
  files: number;
  memberCount: number;
  privacy: 'public' | 'private' | 'restricted';
  createdAt: Date;
}

interface Category extends ChannelCategory {
  count: number; // Channel count per category - will be calculated from actual channels
}

// Direct mapping from backend channel types to categories (simplified)
const CHANNEL_TYPE_TO_CATEGORY_MAP: Record<string, string> = {
  'department': 'department',
  'project': 'project', 
  'initiative': 'project',
  'announcement': 'announcement',
  'temporary': 'general',
  'general': 'general'
};

export const ChannelsScreen: React.FC<{ navigation: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const { common, channels: channelTr } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { canCreateChannels, canAccessResource } = useAuthorization();
  const { on, off, isConnected } = useWebSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [channels, setChannels] = useState<DisplayChannel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submittingChannel, setSubmittingChannel] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState(false);

  // Channel creation/editing form state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '', // channel type (category)
    privacy: 'public' as 'public' | 'private' | 'restricted',
    parent_id: '',
    tags: [] as string[],
    color: '',
    settings: {} as Record<string, any>,
    members: [] as Member[],
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    type: '',
    privacy: '',
    members: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  
  // Modal states for UI consistency
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedChannelForAction, setSelectedChannelForAction] = useState<Channel | null>(null);
  
  const { showError, showSuccess, showWarning } = useToast();

  // Debug: Log when component re-renders
  console.log(`🔄 ChannelsScreen render: ${channels.length} channels, ${filteredChannels?.length || 0} filtered`);

  // Load available members from API (only for users with channel creation permissions)
  const loadAvailableMembers = useCallback(async () => {
    // Check if user has permission to load members
    if (!canCreateChannels()) {
      console.log('User does not have permission to load member list');
      setAvailableMembers([]);
      return;
    }

    // Prevent multiple concurrent requests
    if (loadingMembers) {
      console.log('Already loading members, skipping duplicate request');
      return;
    }

    // If we already have members loaded, don't reload unless necessary
    if (availableMembers.length > 0) {
      console.log('Members already loaded, skipping duplicate request');
      return;
    }

    setLoadingMembers(true);
    
    try {
      // Get current user first to include them in the list
      const currentUser = await userService.getCurrentUser();
      
      // Get list of users
      const usersResponse = await userService.getUsers({ limit: 50 });
      
      // Convert User objects to Member format
      const members: Member[] = usersResponse.users.map(user => ({
        id: user.id,
        name: user.name,
        avatar: user.avatar_url || user.name.charAt(0).toUpperCase(), // Use avatar URL or first letter of name
        role: user.job_title || user.role || 'Member',
        email: user.email,
        department: user.department,
        job_title: user.job_title,
      }));
      
      // Ensure current user is at the beginning of the list with special formatting
      const currentUserMember = members.find(m => m.id === currentUser.id);
      const otherMembers = members.filter(m => m.id !== currentUser.id);
      
      if (currentUserMember) {
        setAvailableMembers([currentUserMember, ...otherMembers]);
      } else {
        // Current user not found in members list - set empty state
        setAvailableMembers(otherMembers);
      }
    } catch (error) {
      console.error('Failed to load available members:', error);
      // Set empty state when unable to load members
      setAvailableMembers([]);
      
      // Handle 403 errors specifically for unauthorized access
      if (error instanceof AuthError && error.message.includes('403')) {
        console.log('User does not have permission to view user list (403 Forbidden)');
        // Don't show error toast for permission issues - this is expected for staff
      } else {
        showError('Unable to load team members. Please try again later.');
      }
    } finally {
      setLoadingMembers(false);
    }
  }, [canCreateChannels, showError, loadingMembers, availableMembers.length]);

  // Categories
  // Load categories from API
  const loadCategories = useCallback(async (channelList?: DisplayChannel[]) => {
    try {
      const apiCategories = await channelService.getChannelCategories();
      
      // Calculate channel counts for each category
      const categoriesWithCounts: Category[] = apiCategories.map(category => ({
        ...category,
        count: (channelList || []).filter(channel => {
          const channelMappedCategory = CHANNEL_TYPE_TO_CATEGORY_MAP[channel.category];
          return channelMappedCategory === category.id;
        }).length,
      }));
      
      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Set empty state when unable to load categories
      setCategories([]);
    }
  }, []); // No dependencies - channelList is always passed as parameter

  // Load channels function
  const loadChannels = useCallback(async (showLoadingSpinner: boolean = true) => {
    // Prevent multiple concurrent requests (but allow refresh)
    if (loading && !refreshing) {
      console.log('Already loading channels, skipping duplicate request');
      return;
    }
    
    try {
      if (showLoadingSpinner) {
        setLoading(true);
      }
      
      // Fetch channels with statistics from API
      try {
        const apiChannelsWithStats = await channelService.getChannelsWithStats();
        
        // Convert API channels to display format directly (simplified)
        const displayChannels: DisplayChannel[] = apiChannelsWithStats.map((apiChannel) => {
          // Use member_details from the API response with proper null checks
          const members: Member[] = apiChannel.member_details?.slice(0, 10)?.map((memberDetail: any) => ({
            id: memberDetail?.id || 'unknown',
            name: memberDetail?.name || 'Unknown User',
            avatar: memberDetail?.avatar_url || memberDetail?.name?.charAt(0)?.toUpperCase() || '?',
            role: memberDetail?.role || 'Member',
            email: memberDetail?.email,
            department: memberDetail?.department,
            job_title: memberDetail?.job_title,
          })).filter(member => member.id !== 'unknown') || [];

          // Direct conversion without unnecessary mapping layer
          return {
            id: apiChannel.id,
            title: apiChannel.name,
            description: apiChannel.description || '',
            category: apiChannel.channel_type || 'general',
            tags: apiChannel.project_info?.tags || [],
            members,
            memberAvatars: members.map(m => m.avatar),
            messages: apiChannel.messageCount || 0,
            files: apiChannel.fileCount || 0,
            memberCount: apiChannel.member_count || members.length,
            privacy: apiChannel.privacy_level || 'public',
            createdAt: new Date(apiChannel.created_at),
          };
        });

        console.log(`Loaded ${displayChannels.length} channels from API`);
        console.log(`📊 Channel details:`, displayChannels.map(c => ({
          title: c.title,
          memberCount: c.memberCount,
          membersArray: c.members.map(m => ({ id: m.id, name: m.name })),
          privacy: c.privacy
        })));
        
        setChannels(displayChannels);
        console.log(`🔄 State updated with ${displayChannels.length} channels`);
        // Update categories with the new channel list immediately
        await loadCategories(displayChannels);
      } catch (apiError) {
        console.warn('Failed to fetch from API:', apiError);
        // Set empty state when unable to load channels
        setChannels([]);
        await loadCategories([]);
      }
      
    } catch (error) {
      console.error('Failed to load channels:', error);
      showError('Failed to load channels. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, refreshing]); // Add loading and refreshing dependencies to prevent concurrent requests

  // Load categories after channels are loaded - removed this useEffect to prevent circular dependency
  // Categories are now loaded directly in loadChannels function

  // Load available members on component mount (only for users who can create channels)
  useEffect(() => {
    if (canCreateChannels()) {
      loadAvailableMembers();
    }
  }, [canCreateChannels]); // Removed loadAvailableMembers dependency to prevent re-execution

  // Initialize form with current user as member when available (only for users who can create channels)
  useEffect(() => {
    if (canCreateChannels() && showCreateChannel && formData.members.length === 0 && availableMembers.length > 0 && user?.id) {
      const currentUserMember = availableMembers.find(member => member.id === user.id);
      if (currentUserMember) {
        setFormData(prev => ({
          ...prev,
          members: [currentUserMember]
        }));
      }
    }
  }, [canCreateChannels, showCreateChannel, availableMembers, formData.members.length, user?.id]);

  // Load channels on component mount
  useEffect(() => {
    console.log('ChannelsScreen mounted, loading channels...');
    loadChannels();
  }, []); // Removed loadChannels dependency to prevent re-execution

  // Check route params for auto-opening create modal
  useEffect(() => {
    if (route?.params?.openCreateModal && canCreateChannels()) {
      setShowCreateChannel(true);
      // Clear the param to prevent reopening on subsequent navigations
      navigation.setParams({ openCreateModal: undefined });
    }
  }, [route?.params?.openCreateModal, canCreateChannels]);

  // WebSocket event listeners for real-time channel updates
  useEffect(() => {
    if (!isConnected) return;

    let unsubscribeFunctions: Array<() => void> = [];

    // Handle channel updated events
    const unsubscribeChannelUpdated = on('channel_updated', (event: any) => {
      console.log('Channel updated via websocket:', event);
      
      // Backend sends: { type, channelId, data: { type, channelId, updates, userId, userName, userRole, timestamp }, timestamp }
      const channelId = event.channelId;
      const updates = event.data?.updates;
      
      if (!channelId || !updates) {
        console.warn('Invalid channel_updated event structure:', event);
        return;
      }
      
      setChannels(prevChannels => 
        prevChannels.map(channel => 
          channel.id === channelId 
            ? { 
                ...channel,
                // Map backend fields to frontend DisplayChannel structure
                title: updates.name || channel.title,
                description: updates.description !== undefined ? updates.description : channel.description,
                category: updates.type || channel.category,
                privacy: updates.privacy || channel.privacy,
                tags: updates.tags || channel.tags,
              }
            : channel
        )
      );
    });
    unsubscribeFunctions.push(unsubscribeChannelUpdated);

    // Handle channel deleted events
    const unsubscribeChannelDeleted = on('channel_deleted', (event: any) => {
      console.log('Channel deleted via websocket:', event);
      
      // Backend sends: { type, channelId, data: { type, channelId, userId, userName, userRole, timestamp }, timestamp }
      const channelId = event.channelId;
      
      if (!channelId) {
        console.warn('Invalid channel_deleted event structure:', event);
        return;
      }
      
      setChannels(prevChannels => 
        prevChannels.filter(channel => channel.id !== channelId)
      );
      showWarning('Channel has been deleted');
    });
    unsubscribeFunctions.push(unsubscribeChannelDeleted);

    // Handle user joined channel events
    const unsubscribeUserJoined = on('user_joined_channel', (event: any) => {
      console.log('🎉 User joined channel via websocket:', event);
      
      // Handle both direct events and wrapped events
      const channelId = event.channelId || event.data?.channelId;
      const memberCount = event.memberCount || event.data?.memberCount;
      
      if (!channelId) {
        console.warn('❌ Invalid user_joined_channel event structure:', event);
        return;
      }
      
      setChannels(prevChannels => {
        const updatedChannels = prevChannels.map(channel => {
          if (channel.id === channelId) {
            const newMemberCount = memberCount !== undefined ? memberCount : channel.memberCount + 1;
            console.log(`📊 Updating channel ${channelId} member count: ${channel.memberCount} → ${newMemberCount}`);
            return { ...channel, memberCount: newMemberCount };
          }
          return channel;
        });
        return updatedChannels;
      });
    });
    unsubscribeFunctions.push(unsubscribeUserJoined);

    // Handle user left channel events - differentiate between disconnection and actual removal
    const unsubscribeUserLeft = on('user_left_channel', (event: any) => {
      const userId = event.userId || event.data?.userId;
      const channelId = event.channelId || event.data?.channelId;
      const memberCount = event.memberCount || event.data?.memberCount;
      const eventType = event.type || event.data?.type;
      const reason = event.reason || event.data?.reason;
      
      if (!channelId) {
        console.warn('Invalid user_left_channel event structure:', event);
        return;
      }

      // Check if this is a temporary disconnection vs permanent removal
      const isTemporaryDisconnection = eventType === 'user_disconnected_from_channel' || reason === 'disconnected';

      if (userId === user?.id) {
        if (isTemporaryDisconnection) {
          // For temporary disconnections, don't remove the channel, just log it
          console.log('🔌 Current user temporarily disconnected from channel WebSocket, keeping channel in list');
          // Optionally update member count to reflect disconnection
          setChannels(prevChannels => 
            prevChannels.map(channel => 
              channel.id === channelId 
                ? { ...channel, memberCount: memberCount !== undefined ? memberCount : Math.max(0, channel.memberCount - 1) }
                : channel
            )
          );
        } else {
          // For actual removals, remove the channel from their list
          console.log('😢 Current user was removed from channel, removing from list');
          setChannels(prevChannels => {
            const filteredChannels = prevChannels.filter(channel => channel.id !== channelId);
            console.log(`🗑️ Removed channel ${channelId}, ${prevChannels.length} -> ${filteredChannels.length} channels`);
            return filteredChannels;
          });
          showWarning('You have been removed from a channel');
        }
      } else {
        // For other users leaving/disconnecting, just update the member count
        console.log('👋 Other user left/disconnected from channel via websocket:', event);
        setChannels(prevChannels => 
          prevChannels.map(channel => 
            channel.id === channelId 
              ? { ...channel, memberCount: memberCount !== undefined ? memberCount : Math.max(0, channel.memberCount - 1) }
              : channel
          )
        );
      }
    });
    unsubscribeFunctions.push(unsubscribeUserLeft);

    // Handle channel created events
    const unsubscribeChannelCreated = on('channel_created', (event: any) => {
      console.log('Channel created via websocket:', event);
      
      // Backend sends: { type, channelId, channel, userId, userName, userRole, timestamp }
      const newChannel = event.channel;
      
      if (!newChannel) {
        console.warn('Invalid channel_created event structure:', event);
        return;
      }
      
      // Convert API channel to display format
      const members: Member[] = newChannel.member_details?.slice(0, 10)?.map((memberDetail: any) => ({
        id: memberDetail?.id || 'unknown',
        name: memberDetail?.name || 'Unknown User',
        avatar: memberDetail?.avatar_url || memberDetail?.name?.charAt(0)?.toUpperCase() || '?',
        role: memberDetail?.role || 'Member',
        email: memberDetail?.email,
        department: memberDetail?.department,
        job_title: memberDetail?.job_title,
      })).filter((member: any) => member.id !== 'unknown') || [];

      const displayChannel: DisplayChannel = {
        id: newChannel.id,
        title: newChannel.name,
        description: newChannel.description || '',
        category: newChannel.channel_type || 'general',
        tags: newChannel.project_info?.tags || [],
        members,
        memberAvatars: members.map(m => m.avatar),
        messages: 0,
        files: 0,
        memberCount: newChannel.member_count || members.length,
        privacy: newChannel.privacy_level || 'public',
        createdAt: new Date(newChannel.created_at),
      };
      
      // Add new channel to the beginning of the list
      setChannels(prevChannels => [displayChannel, ...prevChannels]);
      showSuccess(`New channel "${newChannel.name}" created`);
    });
    unsubscribeFunctions.push(unsubscribeChannelCreated);

    // Handle notification events for member additions and channel updates
    const unsubscribeNotification = on('notification', (event: any) => {
      console.log('📢 Notification received:', event);
      
      // Check if this is a member_added, member_removed, or channel_updated notification
      if (event.activity?.type === 'member_added' || 
          event.activity?.type === 'member_removed' ||
          event.activity?.type === 'channel_updated' ||
          (event.type === 'activity_notification' && 
           (event.activity?.type === 'member_added' || 
            event.activity?.type === 'member_removed' ||
            event.activity?.type === 'channel_updated'))) {
        console.log('👥 Member/channel update notification received, triggering refresh');
        // Use setRefreshing to trigger a refresh without calling loadChannels directly
        setTimeout(() => {
          setRefreshing(true);
        }, 500);
      }
    });
    unsubscribeFunctions.push(unsubscribeNotification);

    return () => {
      console.log('🧹 Cleaning up WebSocket event listeners');
      unsubscribeFunctions.forEach((unsubscribe, index) => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn(`Error unsubscribing from WebSocket event ${index}:`, error);
        }
      });
    };
  }, [isConnected, user?.id]); // Removed 'on' and 'loadChannels' from dependencies to prevent infinite loop

  // Handle programmatic refresh triggers
  useEffect(() => {
    if (refreshing && !loading) {
      console.log('🔄 Programmatic refresh triggered, loading channels...');
      loadChannels(false);
    }
  }, [refreshing, loading]); // Trigger loadChannels when refreshing is set to true

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle search input change with debouncing
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Filter channels based on user role, membership, search query and selected categories
  const filteredChannels = useMemo(() => {
    let filtered = channels;
    console.log(`🔍 Starting filter with ${channels.length} channels`, { 
      userRole: user?.role, 
      userId: user?.id,
      channelTitles: channels.map(c => c.title)
    });

    // Apply role-based filtering first
    if (user?.role === 'staff') {
      // Staff can only see channels they are members of
      filtered = filtered.filter(channel => {
        const isMember = channel.members.some(member => member.id === user.id);
        const isPublicAnnouncement = (channel.privacy === 'public' && channel.category === 'announcement');
        const shouldShow = isMember || isPublicAnnouncement;
        console.log(`📋 Staff filter for "${channel.title}": isMember=${isMember}, isPublicAnnouncement=${isPublicAnnouncement}, shouldShow=${shouldShow}`);
        return shouldShow;
      });
    } else if (user?.role === 'manager') {
      // Managers can see all public channels + channels they're members of + restricted channels for their role
      filtered = filtered.filter(channel => {
        const isPublic = channel.privacy === 'public';
        const isMember = channel.members.some(member => member.id === user.id);
        const isRestricted = channel.privacy === 'restricted';
        const shouldShow = isPublic || isMember || isRestricted;
        console.log(`👔 Manager filter for "${channel.title}": isPublic=${isPublic}, isMember=${isMember}, isRestricted=${isRestricted}, shouldShow=${shouldShow}`);
        return shouldShow;
      });
    }
    // CEOs can see all channels (no filtering needed)
    console.log(`🎯 After role filtering: ${filtered.length} channels remaining`);

    // Filter by selected categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(channel => {
        const channelMappedCategory = CHANNEL_TYPE_TO_CATEGORY_MAP[channel.category];
        return selectedCategories.includes(channelMappedCategory);
      });
    }

    // Filter by debounced search query
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        channel =>
          channel.title.toLowerCase().includes(query) ||
          channel.category.toLowerCase().includes(query) ||
          channel.description.toLowerCase().includes(query) ||
          channel.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    console.log(`✅ Final filtered result: ${filtered.length} channels`, {
      finalChannels: filtered.map(c => ({ title: c.title, privacy: c.privacy, memberCount: c.members.length }))
    });
    return filtered;
  }, [channels, debouncedSearchQuery, selectedCategories, user?.role, user?.id]);

  // Form validation
  const validateForm = () => {
    const errors = { name: '', type: '', privacy: '', members: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = channelTr.channelNameRequired();
      isValid = false;
    } else if (formData.name.trim().length < 2) {
      errors.name = channelTr.channelNameTooShort();
      isValid = false;
    }

    if (!formData.type) {
      errors.type = 'Please select a channel type';
      isValid = false;
    }

    if (!formData.privacy) {
      errors.privacy = 'Please select privacy level';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: '',
      privacy: 'public' as 'public' | 'private' | 'restricted',
      parent_id: '',
      tags: [],
      color: '',
      settings: {},
      members: [],
    });
    setFormErrors({ name: '', type: '', privacy: '', members: '' });
    setTagInput('');
    setIsEditMode(false);
    setEditingChannelId(null);
    setSubmittingChannel(false);
  };

  // Handle form submission (create or edit)
  const handleSubmitChannel = async () => {
    if (!validateForm() || submittingChannel) {
      return;
    }

    setSubmittingChannel(true);

    // Set timeout to prevent modal from hanging indefinitely
    const timeoutId = setTimeout(() => {
      if (submittingChannel) {
        console.warn('Channel update timeout, clearing loading state');
        setSubmittingChannel(false);
        showError('Request timed out. The changes may have been saved. Please refresh to see latest data.');
      }
    }, 65000); // 65 second timeout (slightly more than API timeout)

    try {
      const channelData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type as ApiChannel['channel_type'], // Maps to channel_type in backend
        privacy: formData.privacy as ApiChannel['privacy_level'], // Maps to privacy_level in backend
        ...(formData.parent_id && { parent_id: formData.parent_id }),
        tags: formData.tags,
        ...(formData.color && { color: formData.color }),
        settings: formData.settings,
        members: formData.members, // Include members for backend processing
      };

      if (isEditMode && editingChannelId) {
        // Edit existing channel
        await channelService.updateChannel(editingChannelId, channelData);
        showSuccess(`${channelTr.channelUpdated()}: "${formData.name}"`);
        
        // Refresh channels list for updates (WebSocket handles member changes, but not all field updates)
        await loadChannels(false);
      } else {
        // Create new channel
        await channelService.createChannel(channelData);
        showSuccess(`${channelTr.channelCreated()}: "${formData.name}"`);
        
        // No need to refresh for creation - WebSocket event will add the new channel
      }
      
      // Clear the timeout since operation completed successfully
      clearTimeout(timeoutId);
      
      // Clear loading state immediately after successful operation
      setSubmittingChannel(false);
      
      // Close modal first, then reset form to prevent UI flicker
      setShowCreateChannel(false);
      
      // Reset form after a small delay to ensure modal transition completes
      setTimeout(() => {
        resetForm();
      }, 100);
      
    } catch (error) {
      // Clear the timeout since operation completed (with error)
      clearTimeout(timeoutId);
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} channel:`, {
        error: error instanceof Error ? error.message : error,
        formData,
        channelData: {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          type: formData.type,
          privacy: formData.privacy,
          tags: formData.tags,
          memberCount: formData.members.length,
        }
      });
      
      if (error instanceof AuthError) {
        showError(`${error.message} (${error.code || 'Unknown'})`);
      } else if (error instanceof Error) {
        showError(`Failed to ${isEditMode ? 'update' : 'create'} channel: ${error.message}`);
      } else {
        showError(`Failed to ${isEditMode ? 'update' : 'create'} channel. Please try again.`);
      }
      
      // Clear loading state on error
      setSubmittingChannel(false);
    }
  };

  // Start editing a channel
  const startEditChannel = (channel: DisplayChannel) => {
    setIsEditMode(true);
    setEditingChannelId(channel.id);
    setFormData({
      name: channel.title,
      description: channel.description,
      type: channel.category,
      privacy: channel.privacy,
      parent_id: '',
      tags: channel.tags,
      color: '',
      settings: {},
      members: channel.members,
    });
    setShowCreateChannel(true);
  };

  // Add tag
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Toggle member selection
  const toggleMember = useCallback((member: Member) => {
    // Use functional updates to avoid dependencies
    setFormData(prev => ({
      ...prev,
      members: prev.members.some(m => m.id === member.id)
        ? prev.members.filter(m => m.id !== member.id)
        : [...prev.members, member]
    }));
  }, []);

  const handleChannelPress = (channel: DisplayChannel) => {
    console.log(
      'Navigating to channel:',
      channel.title,
      'with members:',
      channel.members,
    );

    // Check channel membership before navigation (like requireChannelMembership middleware)
    if (user) {
      // CEO can access any channel
      if (user.role !== 'ceo') {
        // Channel creator can access their own channel
        if (channel.created_by !== user.id) {
          // Check if user is explicitly a member
          const isMember = channel.members?.some(member => 
            typeof member === 'string' ? member === user.id : member.id === user.id
          ) || false;

          if (!isMember) {
            showError('You must be a member to access this channel. Contact the CEO to be added to this channel');
            return;
          }
        }
      }
    }

    try {
      // Alternative navigation methods to try if one doesn't work
      if (navigation.navigate) {
        navigation.navigate('ChannelDetailScreen', {
          channelId: channel.id,
          channelName: channel.title,
          members: channel.members,
        });
      } else if (navigation.push) {
        navigation.push('ChannelDetailScreen', {
          channelId: channel.id,
          channelName: channel.title,
          members: channel.members,
        });
      } else {
        throw new Error('Navigation method not available');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown navigation error';
      showError(`Unable to navigate to channel: ${errorMessage}. Please check navigation setup.`);
    }
  };

  const handleChannelOptions = (channel: DisplayChannel) => {
    console.log('handleChannelOptions called', { 
      channelId: channel.id, 
      currentShowState: showActionSheet,
      currentSelectedChannel: selectedChannelForAction?.id 
    });
    
    // Ensure all other modals are closed
    setShowCategoryFilter(false);
    setShowCreateChannel(false);
    setShowMemberSelector(false);
    setShowDeleteConfirmation(false);
    
    // Simple direct state setting
    setSelectedChannelForAction(channel);
    setShowActionSheet(true);
  };

  const handleDeleteChannel = (channel: DisplayChannel) => {
    setSelectedChannelForAction(channel);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteChannel = async () => {
    if (!selectedChannelForAction || deletingChannel) return;
    
    setDeletingChannel(true);
    
    try {
      await channelService.deleteChannel(selectedChannelForAction.id);
      showSuccess(`Channel "${selectedChannelForAction.title}" deleted successfully`);
      
      // Refresh channels list after deletion
      await loadChannels(false);
    } catch (error) {
      console.error('Failed to delete channel:', error);
      if (error instanceof AuthError) {
        showError(error.message);
      } else {
        showError('Failed to delete channel. Please try again.');
      }
    } finally {
      setDeletingChannel(false);
      setShowDeleteConfirmation(false);
      setSelectedChannelForAction(null);
    }
  };

  const handleEditChannel = (channel: DisplayChannel) => {
    startEditChannel(channel);
  };

  // Memoized action sheet options to prevent recreation on every render
  const actionSheetOptions = useMemo(() => {
    if (!selectedChannelForAction) return [];
    
    // Use proper authorization based on backend permissions
    const canEdit = canAccessResource('channels', 'update');
    const canDelete = canAccessResource('channels', 'delete');
    
    const options: Array<{
      text: string;
      icon: string;
      iconLibrary: 'material' | 'ionicon';
      style?: 'default' | 'destructive' | 'cancel';
      onPress: () => void;
    }> = [];
    
    // Store the channel reference for closures
    const channelRef = selectedChannelForAction;
    
    // Add edit option if user has permission
    // For public channels, only CEOs can edit
    if (canEdit && (channelRef.privacy !== 'public' || user?.role === 'ceo')) {
      options.push({
        text: channelTr.editChannel(),
        icon: 'edit',
        iconLibrary: 'material',
        style: 'default',
        onPress: () => {
          handleEditChannel(channelRef);
        },
      });
    }
    
    // Add delete option if user has permission
    // For public channels, only CEOs can delete
    if (canDelete && (channelRef.privacy !== 'public' || user?.role === 'ceo')) {
      options.push({
        text: channelTr.deleteChannel(),
        icon: 'delete',
        iconLibrary: 'material',
        style: 'destructive',
        onPress: () => {
          handleDeleteChannel(channelRef);
        },
      });
    }
    
    // Always add view channel option
    options.push({
      text: channelTr.viewChannel(),
      icon: 'visibility',
      iconLibrary: 'material',
      style: 'default',
      onPress: () => {
        handleChannelPress(channelRef);
      },
    });
    
    options.push({
      text: common.cancel(),
      icon: 'close',
      iconLibrary: 'material',
      style: 'cancel',
      onPress: () => {
        // Cancel doesn't need the channel reference
      },
    });
    
    return options;
  }, [selectedChannelForAction, canAccessResource, channelTr, common]);


  // Removed console.log to improve performance
  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(600).springify()}
        className="flex-row items-center justify-between px-4 py-4"
      >
        <Animated.Text
          entering={FadeInUp.delay(400).duration(500)}
          className="text-gray-900 text-3xl font-bold"
        >
          {channelTr.title()}
        </Animated.Text>
        <Animated.View
          entering={FadeInUp.delay(500).duration(500)}
          className="flex-row items-center space-x-3"
        >
          <AnimatedTouchableOpacity
            entering={FadeInUp.delay(600).duration(400).springify()}
            onPress={() => setShowCategoryFilter(true)}
            className="bg-white rounded-xl p-3 shadow-sm"
          >
            <IonIcon name="filter-outline" size={22} color="#6B7280" />
          </AnimatedTouchableOpacity>
          {canCreateChannels() && (
            <AnimatedTouchableOpacity
              entering={FadeInUp.delay(700).duration(400).springify()}
              onPress={() => setShowCreateChannel(true)}
              className="bg-purple-600 rounded-xl p-3 shadow-lg"
            >
              <Feather name="plus" size={22} color="white" />
            </AnimatedTouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        entering={FadeInDown.duration(800).springify().damping(15)}
        className="px-4 mb-4"
      >
        <View className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <View className="flex-row items-center px-4 py-3">
            <Feather
              name="search"
              size={20}
              color={isSearchFocused ? '#8B5CF6' : '#9CA3AF'}
              style={{ marginRight: 12 }}
            />
            <TextInput
              placeholder={channelTr.searchChannels()}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: '400',
                color: '#1F2937',
              }}
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setDebouncedSearchQuery('');
                }}
                className="p-1"
              >
                <Feather name="x" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Active Filters */}
        {selectedCategories.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            className="mt-3"
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-2 px-1">
                {selectedCategories.map((categoryId) => {
                  const category = categories.find(c => c.id === categoryId);
                  return (
                    <TouchableOpacity
                      key={categoryId}
                      onPress={() => setSelectedCategories(prev => 
                        prev.filter(id => id !== categoryId)
                      )}
                      className="bg-purple-100 rounded-full px-3 py-1 flex-row items-center"
                    >
                      <Text className="text-purple-700 text-sm font-medium mr-1">
                        {category?.name}
                      </Text>
                      <Feather name="x" size={14} color="#7C3AED" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Search Results Info */}
        {(searchQuery.trim() || selectedCategories.length > 0) && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            className="mt-3"
          >
            <Text className="text-gray-600 text-sm">
              {filteredChannels && filteredChannels.length > 0
                ? `${filteredChannels.length} ${channelTr.channelsFound(filteredChannels.length)}`
                : 'No channels found'}
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* Channels List */}
      {loading ? (
        <Animated.View
          entering={FadeInUp.delay(400).duration(600)}
          className="flex-1 items-center justify-center py-12"
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text className="text-gray-500 text-lg font-medium mt-4">
            Loading channels...
          </Text>
        </Animated.View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          removeClippedSubviews={false}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadChannels(false);
              }}
              tintColor="#8B5CF6"
              colors={["#8B5CF6"]}
            />
          }
        >
          {(() => {
            console.log(`🎨 Rendering ${filteredChannels?.length || 0} channels in UI`);
            return filteredChannels && filteredChannels.length > 0 ? (
              <View key={`channel-list-${filteredChannels.length}`}>
                {filteredChannels.map((channel, index) => {
                  console.log(`🔹 Rendering channel ${index + 1}: "${channel.title}"`);
                  return (
                    <Animated.View
                      key={channel.id}
                      entering={FadeInUp.delay(index * 50).duration(400)}
                      style={{ marginBottom: 16, marginHorizontal: 16 }}
                    >
                      <ChannelCard
                        title={channel.title}
                        description={channel.description}
                        category={channel.category}
                        tags={channel.tags}
                        memberAvatars={channel.memberAvatars}
                        memberList={channel.members}
                        messages={channel.messages}
                        files={channel.files}
                        members={channel.memberCount}
                        isPrivate={channel.privacy !== 'public'}
                        privacy={channel.privacy}
                        index={index}
                        onPress={() => handleChannelPress(channel)}
                        onOptionsPress={() => handleChannelOptions(channel)}
                      />
                    </Animated.View>
                  );
                })}
              </View>
            ) : null;
          })()}
            {filteredChannels && filteredChannels.length === 0 && (searchQuery.trim() || selectedCategories.length > 0) ? (
              <Animated.View
                entering={FadeInUp.delay(400).duration(600)}
                className="flex-1 items-center justify-center py-12"
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Feather name="search" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-gray-500 text-lg font-medium mb-2">
                  No channels found
                </Text>
                <Text className="text-gray-400 text-sm text-center px-8">
                  {user?.role === 'staff' 
                    ? 'No accessible channels match your search. You can only see channels you\'re a member of.'
                    : 'Try searching with different keywords or adjusting filters'
                  }
                </Text>
              </Animated.View>
            ) : (!filteredChannels || filteredChannels.length === 0) ? (
              <Animated.View
                entering={FadeInUp.delay(400).duration(600)}
                className="flex-1 items-center justify-center py-12"
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Feather name="plus" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-gray-500 text-lg font-medium mb-2">
                  {user?.role === 'staff' ? 'No channels assigned' : 'No channels yet'}
                </Text>
                <Text className="text-gray-400 text-sm text-center px-8 mb-4">
                  {user?.role === 'staff' 
                    ? "You haven't been added to any channels yet. Contact your manager to be added to relevant channels."
                    : canCreateChannels() 
                      ? 'Create your first channel to start collaborating with your team' 
                      : 'No channels are available to you at this time'
                  }
                </Text>
                {canCreateChannels() && (
                  <TouchableOpacity
                    onPress={() => setShowCreateChannel(true)}
                    className="bg-purple-600 rounded-xl px-6 py-3"
                  >
                    <Text className="text-white font-medium">Create Channel</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            ) : null}
        </ScrollView>
      )}

      {/* Category Filter Modal */}
      <CategoryFilterModal
        visible={showCategoryFilter}
        onClose={() => setShowCategoryFilter(false)}
        categories={categories}
        selectedCategories={selectedCategories}
        onToggleCategory={(categoryId) => {
          setSelectedCategories(prev =>
            prev.includes(categoryId)
              ? prev.filter(id => id !== categoryId)
              : [...prev, categoryId]
          );
        }}
        onClearAll={() => setSelectedCategories([])}
      />

      {/* Create Channel Modal - Only show for users with create permissions */}
      {canCreateChannels() && (
        <CreateChannelModal
          visible={showCreateChannel}
          onClose={() => {
            // Force clear loading state to allow modal to close
            setSubmittingChannel(false);
            resetForm();
            setShowCreateChannel(false);
          }}
        isEditMode={isEditMode}
        formData={formData}
        formErrors={formErrors}
        availableMembers={availableMembers}
        tagInput={tagInput}
        submitting={submittingChannel}
        user={user}
        onFormDataChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        onFormErrorsChange={(errors) => setFormErrors(prev => ({ ...prev, ...errors }))}
        onTagInputChange={setTagInput}
        onSubmit={handleSubmitChannel}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        onToggleMember={toggleMember}
        onShowMemberSelector={() => setShowMemberSelector(true)}
      />
      )}

      {/* Member Selector Modal - Only show for users with create permissions */}
      {canCreateChannels() && (
        <MemberSelectorModal
          visible={showMemberSelector}
          onClose={() => setShowMemberSelector(false)}
          availableMembers={availableMembers}
          selectedMembers={formData.members}
          loadingMembers={loadingMembers}
          onToggleMember={toggleMember}
        />
      )}

      {/* Action Sheet for Channel Options */}
      <ActionSheet
        visible={showActionSheet}
        title={channelTr.channelOptions()}
        message={selectedChannelForAction ? `Options for "${selectedChannelForAction.title}"` : ''}
        options={actionSheetOptions}
        onClose={() => {
          console.log('ActionSheet onClose called');
          setShowActionSheet(false);
          setSelectedChannelForAction(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteConfirmation}
        title={channelTr.deleteChannel()}
        message={
          selectedChannelForAction
            ? `Are you sure you want to delete "${selectedChannelForAction.title}"? This action cannot be undone and will remove all messages and files in this channel.`
            : ''
        }
        confirmText={deletingChannel ? 'Deleting...' : common.delete()}
        cancelText={common.cancel()}
        confirmStyle="destructive"
        onConfirm={confirmDeleteChannel}
        onCancel={() => {
          if (!deletingChannel) {
            setShowDeleteConfirmation(false);
            setSelectedChannelForAction(null);
          }
        }}
      />
    </View>
  );
};