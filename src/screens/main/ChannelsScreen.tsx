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
import { ChannelCard, ConfirmationModal, ActionSheet } from '../../components/common';
import { CreateChannelModal } from '../../components/channel/CreateChannelModal';
import { MemberSelectorModal } from '../../components/channel/MemberSelectorModal';
import { CategoryFilterModal } from '../../components/channel/CategoryFilterModal';
import { useAppTranslation } from '../../hooks/useAppTranslation';

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

interface Channel {
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

interface DisplayChannel extends Channel {}

interface Category extends ChannelCategory {
  count: number; // Channel count per category - will be calculated from actual channels
}

// Map channel_type to category IDs
const CHANNEL_TYPE_TO_CATEGORY_MAP: Record<string, string> = {
  'department': 'department',
  'project': 'project', 
  'initiative': 'project', // initiatives are project-like
  'announcement': 'announcement',
  'temporary': 'general',
  'emergency': 'general',
  'general': 'general',
  'private': 'private'
};

// Map API channel to display channel with enhanced statistics
const mapApiChannelToDisplayChannel = (apiChannel: ApiChannel, stats?: {
  messageCount: number;
  fileCount: number;
  members: Member[];
}): Channel => {
return  ({
    id: apiChannel.id,
    title: apiChannel.name,
    description: apiChannel.description || '',
    category: apiChannel.channel_type || 'general',
    tags: apiChannel.project_info.tags, // Tags would need to be implemented in the API
    members: stats?.members || [], // Members from API
    memberAvatars:
      stats?.members?.map(m => m.avatar || m.name?.charAt(0) || '?') || [], // URLs if available, otherwise initials
    messages: stats?.messageCount || 0, // Actual message count from API
    files: stats?.fileCount || 0, // Actual file count from API
    memberCount: apiChannel.member_count || stats?.members?.length || 0,
    privacy: apiChannel.privacy_level || 'public',
    createdAt: new Date(apiChannel.created_at),
  });
}

export const ChannelsScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { common, channels: channelTr } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
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

  // Load available members from API
  const loadAvailableMembers = useCallback(async () => {
    // Use functional update to check loading state without adding to dependencies
    setLoadingMembers(current => {
      if (current) return current; // Already loading, don't start another request
      return true; // Start loading
    });
    
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
      // Use functional update to avoid dependency
      showError('Unable to load team members. Please try again later.');
    } finally {
      setLoadingMembers(false);
    }
  }, []); // Remove showWarning dependency

  // Categories
  // Load categories from API
  const loadCategories = useCallback(async (channelList?: Channel[]) => {
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
    // Prevent multiple concurrent requests
    if (loading && showLoadingSpinner) {
      return;
    }
    
    try {
      if (showLoadingSpinner) {
        setLoading(true);
      }
      
      // Fetch channels with statistics from API
      try {
        const apiChannelsWithStats = await channelService.getChannelsWithStats();
        
        // Use member_details from API response directly with error boundary protection
        const displayChannels: Channel[] = apiChannelsWithStats.map((apiChannel) => {
          try {
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

            return mapApiChannelToDisplayChannel(apiChannel, {
              messageCount: apiChannel.messageCount || 0,
              fileCount: apiChannel.fileCount || 0,
              members,
            });
          } catch (channelMappingError) {
            console.warn('Failed to map channel data:', {
              channelId: apiChannel?.id,
              error: channelMappingError
            });
            // Return a safe default channel object for malformed data
            return {
              id: apiChannel?.id || 'error-channel',
              title: apiChannel?.name || 'Unknown Channel',
              description: 'Error loading channel data',
              category: 'general',
              tags: [],
              members: [],
              memberAvatars: [],
              messages: 0,
              files: 0,
              memberCount: 0,
              privacy: 'public' as const,
              createdAt: new Date(),
            };
          }
        }).filter(channel => channel.id !== 'error-channel');
        
        setChannels(displayChannels);
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
  }, []); // No dependencies to prevent re-renders - functions are stable

  // Load categories after channels are loaded - removed this useEffect to prevent circular dependency
  // Categories are now loaded directly in loadChannels function

  // Load available members on component mount
  useEffect(() => {
    loadAvailableMembers();
  }, [loadAvailableMembers]);

  // Initialize form with current user as member when available
  useEffect(() => {
    if (showCreateChannel && formData.members.length === 0 && availableMembers.length > 0 && user?.id) {
      const currentUserMember = availableMembers.find(member => member.id === user.id);
      if (currentUserMember) {
        setFormData(prev => ({
          ...prev,
          members: [currentUserMember]
        }));
      }
    }
  }, [showCreateChannel, availableMembers, formData.members.length, user?.id]);

  // Load channels on component mount
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

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

  // Filter channels based on debounced search query and selected categories
  const filteredChannels = useMemo(() => {
    let filtered = channels;

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

    return filtered;
  }, [channels, debouncedSearchQuery, selectedCategories]);

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
      };

      if (isEditMode && editingChannelId) {
        // Edit existing channel
        await channelService.updateChannel(editingChannelId, channelData);
        showSuccess(`${channelTr.channelUpdated()}: "${formData.name}"`);
      } else {
        // Create new channel
        await channelService.createChannel(channelData);
        showSuccess(`${channelTr.channelCreated()}: "${formData.name}"`);
      }
      
      // Refresh channels list
      await loadChannels(false);
      
      // Close modal first, then reset form to prevent UI flicker
      setShowCreateChannel(false);
      
      // Reset form after a small delay to ensure modal transition completes
      setTimeout(() => {
        resetForm();
      }, 100);
      
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} channel:`, {
        error: error instanceof Error ? error.message : error,
        formData,
        channelData: {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          type: formData.type,
          privacy: formData.privacy,
          tags: formData.tags,
        }
      });
      
      if (error instanceof AuthError) {
        showError(`${error.message} (${error.code || 'Unknown'})`);
      } else if (error instanceof Error) {
        showError(`Failed to ${isEditMode ? 'update' : 'create'} channel: ${error.message}`);
      } else {
        showError(`Failed to ${isEditMode ? 'update' : 'create'} channel. Please try again.`);
      }
    } finally {
      setSubmittingChannel(false);
    }
  };

  // Start editing a channel
  const startEditChannel = (channel: Channel) => {
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

  const handleChannelPress = (channel: Channel) => {
    console.log(
      'Navigating to channel:',
      channel.title,
      'with members:',
      channel.members,
    );

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

  const handleDeleteChannel = (channel: Channel) => {
    setSelectedChannelForAction(channel);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteChannel = async () => {
    if (!selectedChannelForAction || deletingChannel) return;
    
    setDeletingChannel(true);
    
    try {
      await channelService.deleteChannel(selectedChannelForAction.id);
      showSuccess(`Channel "${selectedChannelForAction.title}" deleted successfully`);
      
      // Refresh channels list
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

  const handleEditChannel = (channel: Channel) => {
    startEditChannel(channel);
  };

  // Memoized action sheet options to prevent recreation on every render
  const actionSheetOptions = useMemo(() => {
    if (!selectedChannelForAction) return [];
    
    // Check if user can edit (CEO, channel owner, or channel admin)
    const canEdit = user?.role === 'ceo' || 
                   selectedChannelForAction.members.some(m => 
                     m.id === user?.id && (m.role === 'owner' || m.role === 'admin'));
    
    // Check if user can delete (CEO or channel owner only)
    const canDelete = user?.role === 'ceo' || 
                     selectedChannelForAction.members.some(m => 
                       m.id === user?.id && m.role === 'owner');
    
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
    if (canEdit) {
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
    if (canDelete) {
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
  }, [selectedChannelForAction, user?.role, user?.id, channelTr, common]);



    console.log("Visible Actions",showActionSheet, selectedChannelForAction?.id, actionSheetOptions);
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
          <AnimatedTouchableOpacity
            entering={FadeInUp.delay(700).duration(400).springify()}
            onPress={() => setShowCreateChannel(true)}
            className="bg-purple-600 rounded-xl p-3 shadow-lg"
          >
            <Feather name="plus" size={22} color="white" />
          </AnimatedTouchableOpacity>
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
              {filteredChannels.length > 0
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
          <Animated.View entering={FadeInUp.delay(800).duration(600)}>
            {filteredChannels.length > 0 ? (
              filteredChannels.map((channel, index) => (
                <ChannelCard
                  key={channel.id}
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
                  index={index}
                  onPress={() => handleChannelPress(channel)}
                  onOptionsPress={() => handleChannelOptions(channel)}
                />
              ))
            ) : searchQuery.trim() || selectedCategories.length > 0 ? (
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
                  Try searching with different keywords or adjusting filters
                </Text>
              </Animated.View>
            ) : (
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
                  No channels yet
                </Text>
                <Text className="text-gray-400 text-sm text-center px-8 mb-4">
                  Create your first channel to start collaborating with your team
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCreateChannel(true)}
                  className="bg-purple-600 rounded-xl px-6 py-3"
                >
                  <Text className="text-white font-medium">Create Channel</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
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

      {/* Create Channel Modal */}
      <CreateChannelModal
        visible={showCreateChannel}
        onClose={() => {
          resetForm();
          setShowCreateChannel(false);
        }}
        isEditMode={isEditMode}
        formData={formData}
        formErrors={formErrors}
        availableMembers={availableMembers}
        tagInput={tagInput}
        submitting={submittingChannel}
        onFormDataChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        onFormErrorsChange={(errors) => setFormErrors(prev => ({ ...prev, ...errors }))}
        onTagInputChange={setTagInput}
        onSubmit={handleSubmitChannel}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        onToggleMember={toggleMember}
        onShowMemberSelector={() => setShowMemberSelector(true)}
      />

      {/* Member Selector Modal */}
      <MemberSelectorModal
        visible={showMemberSelector}
        onClose={() => setShowMemberSelector(false)}
        availableMembers={availableMembers}
        selectedMembers={formData.members}
        loadingMembers={loadingMembers}
        onToggleMember={toggleMember}
      />

      {/* Action Sheet for Channel Options */}
      {showActionSheet && (
        <ActionSheet
          key={selectedChannelForAction?.id || 'action-sheet'} // Force re-render with key
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
      )}

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