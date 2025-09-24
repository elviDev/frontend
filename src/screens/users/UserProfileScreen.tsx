import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  SlideInRight,
  SlideInLeft,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { useToast } from '../../contexts/ToastContext';
import { userService, User, UpdateUserData, ChangePasswordData } from '../../services/api/userService';
import { AuthError } from '../../services/api/authService';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { announcementService, CreateAnnouncementData } from '../../services/api/announcementService';
import { useUI } from '../../components/common/UIProvider';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

export const UserProfileScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { t } = useTranslation();
  const { userId } = route?.params || {};
  const insets = useSafeAreaInsets();
  const { user: currentUser, logout } = useAuth();
  const { showError, showSuccess, showInfo, showToast } = useToast();
  const { showConfirm } = useUI();

  // State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    department: '',
    job_title: '',
    phone: '',
    timezone: '',
    language_preference: 'en',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Announcement form state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'info' as const,
    priority: 'medium' as const,
    target_audience: 'all' as const,
    scheduled_for: '',
    expires_at: '',
    action_button_text: '',
    action_button_url: '',
    published: true,
  });

  const [announcementErrors, setAnnouncementErrors] = useState({
    title: '',
    content: '',
  });

  // Animation values
  const headerOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);

  // Animated styles
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetUserId = userId || currentUser?.id;


  // Check if current user is admin/manager
  const isAdmin = currentUser?.role === 'ceo';
  const isManager = currentUser?.role === 'manager';
  const canViewOtherProfiles = isAdmin || isManager;

  useEffect(() => {
    // Start animations
    headerOpacity.value = withTiming(1, { duration: 800 });
    contentTranslateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    
    loadUserProfile();
  }, [targetUserId]);

  const loadUserProfile = async () => {
    if (!targetUserId) {
      showError('User ID not found');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      
      let userData: User;
      if (isOwnProfile) {
        // Always fetch fresh data for own profile to ensure all fields are present
        console.log('Fetching current user profile data...');
        userData = await userService.getCurrentUser();
        console.log('Fetched user data:', {
          name: userData.name,
          email: userData.email,
          department: userData.department,
          job_title: userData.job_title,
          phone: userData.phone,
          timezone: userData.timezone,
          role: userData.role
        });
      } else {
        if (!canViewOtherProfiles) {
          showError('You do not have permission to view other user profiles');
          navigation.goBack();
          return;
        }
        userData = await userService.getUserById(targetUserId);
      }
      
      setUser(userData);
      
      
      // Populate edit form
      setEditForm({
        name: userData.name || '',
        department: userData.department || '',
        job_title: userData.job_title || '',
        phone: userData.phone || '',
        timezone: userData.timezone || '',
        language_preference: userData.language_preference || 'en',
      });
      
    } catch (error) {
      console.error('Failed to load user profile:', error);
      if (error instanceof AuthError) {
        showError(error.message);
        if (error.statusCode === 401) {
          // Session expired, logout user
          logout();
        }
      } else {
        showError('Failed to load profile. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUserProfile();
  };

  const validateEditForm = () => {
    const errors = { name: '', currentPassword: '', newPassword: '', confirmPassword: '' };
    let isValid = true;

    if (!editForm.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    } else if (editForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const validatePasswordForm = () => {
    const errors = { name: '', currentPassword: '', newPassword: '', confirmPassword: '' };
    let isValid = true;

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
      isValid = false;
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
      isValid = false;
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSaveProfile = async () => {
    if (!validateEditForm()) {
      return;
    }

    try {
      setIsEditing(true);
      
      const updateData: UpdateUserData = {
        name: editForm.name.trim(),
        department: editForm.department.trim() || undefined,
        job_title: editForm.job_title.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        timezone: editForm.timezone.trim() || undefined,
        language_preference: editForm.language_preference || undefined,
      };

      let updatedUser: User;
      if (isOwnProfile) {
        updatedUser = await userService.updateCurrentUser(updateData);
      } else {
        updatedUser = await userService.updateUser(targetUserId!, updateData);
      }
      
      setUser(updatedUser);
      setShowEditModal(false);
      showSuccess('Profile updated successfully!');
      
    } catch (error) {
      console.error('Failed to update profile:', error);
      if (error instanceof AuthError) {
        showError(error.message);
      } else {
        showError('Failed to update profile. Please try again.');
      }
    } finally {
      setIsEditing(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      setIsEditing(true);
      
      const passwordData: ChangePasswordData = {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      };

      await userService.changeCurrentUserPassword(passwordData);
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordModal(false);
      showSuccess('Password changed successfully!');
      
    } catch (error) {
      console.error('Failed to change password:', error);
      if (error instanceof AuthError) {
        showError(error.message);
      } else {
        showError('Failed to change password. Please try again.');
      }
    } finally {
      setIsEditing(false);
    }
  };

  const validateAnnouncementForm = () => {
    const errors = { title: '', content: '' };
    let isValid = true;

    if (!announcementForm.title.trim()) {
      errors.title = 'Title is required';
      isValid = false;
    } else if (announcementForm.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
      isValid = false;
    }

    if (!announcementForm.content.trim()) {
      errors.content = 'Content is required';
      isValid = false;
    } else if (announcementForm.content.trim().length < 10) {
      errors.content = 'Content must be at least 10 characters';
      isValid = false;
    }

    setAnnouncementErrors(errors);
    return isValid;
  };

  const handleCreateAnnouncement = async () => {
    if (!validateAnnouncementForm()) {
      return;
    }

    try {
      setIsCreatingAnnouncement(true);
      
      const announcementData: CreateAnnouncementData = {
        title: announcementForm.title.trim(),
        content: announcementForm.content.trim(),
        type: announcementForm.type,
        priority: announcementForm.priority,
        target_audience: announcementForm.target_audience,
        scheduled_for: announcementForm.scheduled_for || undefined,
        expires_at: announcementForm.expires_at || undefined,
        action_button_text: announcementForm.action_button_text.trim() || undefined,
        action_button_url: announcementForm.action_button_url.trim() || undefined,
        published: announcementForm.published,
      };

      await announcementService.createAnnouncement(announcementData);
      
      // Reset form
      setAnnouncementForm({
        title: '',
        content: '',
        type: 'info',
        priority: 'medium',
        target_audience: 'all',
        scheduled_for: '',
        expires_at: '',
        action_button_text: '',
        action_button_url: '',
        published: true,
      });
      setShowAnnouncementModal(false);
      showSuccess('Announcement created successfully!');
      
    } catch (error) {
      console.error('Failed to create announcement:', error);
      showError('Failed to create announcement. Please try again.');
    } finally {
      setIsCreatingAnnouncement(false);
    }
  };

  const handleAdminAccess = () => {
    if (isAdmin) {
      try {
        navigation.navigate('AdminDashboard');
      } catch (error) {
        console.error('❌ Admin navigation error:', error);
        showError('Failed to navigate to admin dashboard. Please try again.');
      }
    } else {
      showInfo('Admin access is restricted to CEO level users');
    }
  };

  const handleLogout = () => {
    showConfirm(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      () => {
        logout();
      },
      undefined,
      {
        confirmText: t('auth.logout'),
        cancelText: t('auth.cancel'),
        destructive: true,
      }
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ceo': return '#EF4444';
      case 'manager': return '#F59E0B';
      case 'staff': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ceo': return 'star';
      case 'manager': return 'people';
      case 'staff': return 'person';
      default: return 'person';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatLastActive = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <LoadingSpinner />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center" style={{ paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <IonIcon name="person-circle-outline" size={80} color="#9CA3AF" />
        <Text className="text-gray-500 text-lg font-medium mt-4">User not found</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-purple-600 px-6 py-3 rounded-xl mt-6"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <Animated.View
        style={[headerAnimatedStyle]}
        className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-200"
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 p-2 rounded-full"
          >
            <MaterialIcon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">
            {isOwnProfile ? 'My Profile' : 'User Profile'}
          </Text>
        </View>
        
        {isOwnProfile && (
          <TouchableOpacity
            onPress={() => setShowEditModal(true)}
            className="bg-purple-600 px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-medium">Edit</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8B5CF6"
            colors={["#8B5CF6"]}
          />
        }
      >
        <Animated.View style={[contentAnimatedStyle]}>
          {/* Profile Header */}
          <AnimatedView
            entering={FadeInUp.delay(200).duration(600).springify()}
            className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-sm"
          >
            {/* Avatar and Basic Info */}
            <View className="items-center mb-6">
              <LinearGradient
                colors={['#8B5CF6', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Text className="text-white text-3xl font-bold">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>

              <Text className="text-2xl font-bold text-gray-900 mb-2">{user.name}</Text>
              <Text className="text-gray-600 text-lg mb-3">{user.email}</Text>
              
              {/* Role Badge */}
              <View
                className="flex-row items-center px-4 py-2 rounded-full"
                style={{ backgroundColor: getRoleColor(user.role) + '20' }}
              >
                <IonIcon 
                  name={getRoleIcon(user.role)} 
                  size={16} 
                  color={getRoleColor(user.role)} 
                />
                <Text 
                  className="font-semibold ml-2 capitalize"
                  style={{ color: getRoleColor(user.role) }}
                >
                  {user.role}
                </Text>
              </View>

              {/* Email Verification Status */}
              <View className="flex-row items-center mt-3">
                <IonIcon 
                  name={user.email_verified ? "checkmark-circle" : "alert-circle"} 
                  size={16} 
                  color={user.email_verified ? "#10B981" : "#F59E0B"} 
                />
                <Text 
                  className="ml-2 text-sm font-medium"
                  style={{ color: user.email_verified ? "#10B981" : "#F59E0B" }}
                >
                  {user.email_verified ? 'Email Verified' : 'Email Not Verified'}
                </Text>
              </View>
            </View>
          </AnimatedView>

          {/* Profile Details */}
          <AnimatedView
            entering={FadeInUp.delay(400).duration(600).springify()}
            className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-sm"
          >
            <Text className="text-lg font-bold text-gray-900 mb-4">Profile Information</Text>
            
            <View className="space-y-4">
              {/* Department */}
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-4">
                  <IonIcon name="business-outline" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Department</Text>
                  <Text className="text-gray-900 font-medium">
                    {user.department || 'Not specified'}
                  </Text>
                </View>
              </View>

              {/* Job Title */}
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-4">
                  <IonIcon name="briefcase-outline" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Job Title</Text>
                  <Text className="text-gray-900 font-medium">
                    {user.job_title || 'Not specified'}
                  </Text>
                </View>
              </View>

              {/* Phone */}
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-4">
                  <IonIcon name="call-outline" size={20} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Phone</Text>
                  <Text className="text-gray-900 font-medium">
                    {user.phone || 'Not specified'}
                  </Text>
                </View>
                {user.phone && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${user.phone}`)}
                    className="ml-2"
                  >
                    <IonIcon name="call" size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Timezone */}
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-4">
                  <IonIcon name="time-outline" size={20} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Timezone</Text>
                  <Text className="text-gray-900 font-medium">
                    {user.timezone || 'Not specified'}
                  </Text>
                </View>
              </View>

              {/* Language */}
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-4">
                  <IonIcon name="language-outline" size={20} color="#EF4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Language</Text>
                  <Text className="text-gray-900 font-medium">
                    {user.language_preference === 'en' ? 'English' : user.language_preference || 'English'}
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedView>

          {/* Account Information */}
          <AnimatedView
            entering={FadeInUp.delay(600).duration(600).springify()}
            className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-sm"
          >
            <Text className="text-lg font-bold text-gray-900 mb-4">Account Information</Text>
            
            <View className="space-y-4">
              {/* Member Since */}
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-4">
                  <IonIcon name="calendar-outline" size={20} color="#6366F1" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Member Since</Text>
                  <Text className="text-gray-900 font-medium">
                    {formatDate(user.created_at)}
                  </Text>
                </View>
              </View>

              {/* Last Active */}
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-4">
                  <IonIcon name="pulse-outline" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Last Active</Text>
                  <Text className="text-gray-900 font-medium">
                    {formatLastActive(user.last_active)}
                  </Text>
                </View>
              </View>

              {/* Last Updated */}
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-4">
                  <IonIcon name="refresh-outline" size={20} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Profile Updated</Text>
                  <Text className="text-gray-900 font-medium">
                    {formatDate(user.updated_at)}
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedView>

          {/* Actions */}
          {isOwnProfile && (
            <AnimatedView
              entering={FadeInUp.delay(800).duration(600).springify()}
              className="mx-4 mt-4 space-y-3"
            >
              {/* Change Password */}
              <TouchableOpacity
                onPress={() => setShowPasswordModal(true)}
                className="bg-white rounded-2xl p-4 shadow-sm flex-row items-center"
              >
                <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-4">
                  <IonIcon name="key-outline" size={20} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold">Change Password</Text>
                  <Text className="text-gray-500 text-sm">Update your account password</Text>
                </View>
                <IonIcon name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Create Announcement (CEO only) */}
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setShowAnnouncementModal(true)}
                  className="bg-white rounded-2xl p-4 shadow-sm flex-row items-center"
                >
                  <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-4">
                    <IonIcon name="megaphone-outline" size={20} color="#8B5CF6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold">Create Announcement</Text>
                    <Text className="text-gray-500 text-sm">Send company-wide announcements</Text>
                  </View>
                  <IonIcon name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              {/* Admin Access */}
              {isAdmin && (
                <TouchableOpacity
                  onPress={handleAdminAccess}
                  className="bg-white rounded-2xl p-4 shadow-sm flex-row items-center"
                >
                  <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-4">
                    <IonIcon name="settings-outline" size={20} color="#EF4444" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold">Admin Dashboard</Text>
                    <Text className="text-gray-500 text-sm">Access admin functions</Text>
                  </View>
                  <IonIcon name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              {/* Language Settings */}
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                <LanguageSwitcher />
              </View>

              {/* Logout */}
              <TouchableOpacity
                onPress={handleLogout}
                className="bg-white rounded-2xl p-4 shadow-sm flex-row items-center"
              >
                <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-4">
                  <IonIcon name="log-out-outline" size={20} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold">{t('auth.logout')}</Text>
                  <Text className="text-gray-500 text-sm">{t('auth.logoutDescription')}</Text>
                </View>
                <IonIcon name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </AnimatedView>
          )}

          {/* Bottom Spacing */}
          <View className="h-8" />
        </Animated.View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '85%' }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                className="p-2"
              >
                <MaterialIcon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Full Name *</Text>
                <View className={`bg-gray-50 rounded-xl px-4 py-3 border ${formErrors.name ? 'border-red-300' : 'border-gray-200'}`}>
                  <TextInput
                    placeholder="Enter your full name"
                    value={editForm.name}
                    onChangeText={(text) => {
                      setEditForm(prev => ({ ...prev, name: text }));
                      if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className="text-gray-900 text-base"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                {formErrors.name ? (
                  <Text className="text-red-500 text-sm mt-1">{formErrors.name}</Text>
                ) : null}
              </View>

              {/* Department */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Department</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <TextInput
                    placeholder="Enter your department"
                    value={editForm.department}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, department: text }))}
                    className="text-gray-900 text-base"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Job Title */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Job Title</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <TextInput
                    placeholder="Enter your job title"
                    value={editForm.job_title}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, job_title: text }))}
                    className="text-gray-900 text-base"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Phone */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Phone Number</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <TextInput
                    placeholder="Enter your phone number"
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                    className="text-gray-900 text-base"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Timezone */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Timezone</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <TextInput
                    placeholder="Enter your timezone (e.g., UTC-5, EST)"
                    value={editForm.timezone}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, timezone: text }))}
                    className="text-gray-900 text-base"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row space-x-3 pt-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                className="flex-1 bg-gray-100 rounded-xl py-4"
              >
                <Text className="text-gray-700 font-medium text-center">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isEditing}
                className={`flex-1 rounded-xl py-4 ${isEditing ? 'bg-gray-300' : 'bg-purple-600'}`}
              >
                <Text className="text-white font-medium text-center">
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '70%' }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                className="p-2"
              >
                <MaterialIcon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Current Password */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Current Password *</Text>
                <View className={`bg-gray-50 rounded-xl px-4 py-3 border ${formErrors.currentPassword ? 'border-red-300' : 'border-gray-200'}`}>
                  <TextInput
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChangeText={(text) => {
                      setPasswordForm(prev => ({ ...prev, currentPassword: text }));
                      if (formErrors.currentPassword) setFormErrors(prev => ({ ...prev, currentPassword: '' }));
                    }}
                    secureTextEntry
                    className="text-gray-900 text-base"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                {formErrors.currentPassword ? (
                  <Text className="text-red-500 text-sm mt-1">{formErrors.currentPassword}</Text>
                ) : null}
              </View>

              {/* New Password */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">New Password *</Text>
                <View className={`bg-gray-50 rounded-xl px-4 py-3 border ${formErrors.newPassword ? 'border-red-300' : 'border-gray-200'}`}>
                  <TextInput
                    placeholder="Enter new password"
                    value={passwordForm.newPassword}
                    onChangeText={(text) => {
                      setPasswordForm(prev => ({ ...prev, newPassword: text }));
                      if (formErrors.newPassword) setFormErrors(prev => ({ ...prev, newPassword: '' }));
                    }}
                    secureTextEntry
                    className="text-gray-900 text-base"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                {formErrors.newPassword ? (
                  <Text className="text-red-500 text-sm mt-1">{formErrors.newPassword}</Text>
                ) : null}
              </View>

              {/* Confirm Password */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">Confirm New Password *</Text>
                <View className={`bg-gray-50 rounded-xl px-4 py-3 border ${formErrors.confirmPassword ? 'border-red-300' : 'border-gray-200'}`}>
                  <TextInput
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChangeText={(text) => {
                      setPasswordForm(prev => ({ ...prev, confirmPassword: text }));
                      if (formErrors.confirmPassword) setFormErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }}
                    secureTextEntry
                    className="text-gray-900 text-base"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                {formErrors.confirmPassword ? (
                  <Text className="text-red-500 text-sm mt-1">{formErrors.confirmPassword}</Text>
                ) : null}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row gap-x-4 pt-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                className="flex-1 bg-gray-100 rounded-xl py-4"
              >
                <Text className="text-gray-700 font-medium text-center">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={isEditing}
                className={`flex-1 rounded-xl py-4 ${isEditing ? 'bg-gray-300' : 'bg-purple-600'}`}
              >
                <Text className="text-white font-medium text-center">
                  {isEditing ? 'Changing...' : 'Change Password'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Announcement Modal */}
      <Modal
        visible={showAnnouncementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnnouncementModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '90%' }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Create Announcement</Text>
              <TouchableOpacity
                onPress={() => setShowAnnouncementModal(false)}
                className="p-2"
              >
                <MaterialIcon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Title *</Text>
                <View className={`bg-gray-50 rounded-xl px-4 py-3 border ${announcementErrors.title ? 'border-red-300' : 'border-gray-200'}`}>
                  <TextInput
                    placeholder="Enter announcement title"
                    value={announcementForm.title}
                    onChangeText={(text) => {
                      setAnnouncementForm(prev => ({ ...prev, title: text }));
                      if (announcementErrors.title) setAnnouncementErrors(prev => ({ ...prev, title: '' }));
                    }}
                    className="text-gray-900 text-base"
                    placeholderTextColor="#9CA3AF"
                    maxLength={200}
                  />
                </View>
                {announcementErrors.title ? (
                  <Text className="text-red-500 text-sm mt-1">{announcementErrors.title}</Text>
                ) : null}
              </View>

              {/* Content */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Content *</Text>
                <View className={`bg-gray-50 rounded-xl px-4 py-3 border ${announcementErrors.content ? 'border-red-300' : 'border-gray-200'}`}>
                  <TextInput
                    placeholder="Enter announcement content"
                    value={announcementForm.content}
                    onChangeText={(text) => {
                      setAnnouncementForm(prev => ({ ...prev, content: text }));
                      if (announcementErrors.content) setAnnouncementErrors(prev => ({ ...prev, content: '' }));
                    }}
                    className="text-gray-900 text-base"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    style={{ minHeight: 100, textAlignVertical: 'top' }}
                    maxLength={5000}
                  />
                </View>
                {announcementErrors.content ? (
                  <Text className="text-red-500 text-sm mt-1">{announcementErrors.content}</Text>
                ) : null}
              </View>

              {/* Type and Priority Row */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-gray-700 font-medium mb-2">Type</Text>
                  <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    <TouchableOpacity onPress={() => {
                      // In a real app, you'd want to show a picker/dropdown here
                      const types = ['info', 'warning', 'success', 'error', 'feature', 'maintenance'];
                      const currentIndex = types.indexOf(announcementForm.type);
                      const nextIndex = (currentIndex + 1) % types.length;
                      setAnnouncementForm(prev => ({ ...prev, type: types[nextIndex] as any }));
                    }}>
                      <Text className="text-gray-900 text-base capitalize">{announcementForm.type}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View className="flex-1">
                  <Text className="text-gray-700 font-medium mb-2">Priority</Text>
                  <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    <TouchableOpacity onPress={() => {
                      const priorities = ['low', 'medium', 'high', 'critical'];
                      const currentIndex = priorities.indexOf(announcementForm.priority);
                      const nextIndex = (currentIndex + 1) % priorities.length;
                      setAnnouncementForm(prev => ({ ...prev, priority: priorities[nextIndex] as any }));
                    }}>
                      <Text className="text-gray-900 text-base capitalize">{announcementForm.priority}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Target Audience */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Target Audience</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <TouchableOpacity onPress={() => {
                    const audiences = ['all', 'admins', 'developers', 'designers', 'managers'];
                    const currentIndex = audiences.indexOf(announcementForm.target_audience);
                    const nextIndex = (currentIndex + 1) % audiences.length;
                    setAnnouncementForm(prev => ({ ...prev, target_audience: audiences[nextIndex] as any }));
                  }}>
                    <Text className="text-gray-900 text-base capitalize">
                      {announcementForm.target_audience === 'all' ? 'Everyone' : announcementForm.target_audience}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Button (Optional) */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Action Button (Optional)</Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                      <TextInput
                        placeholder="Button text"
                        value={announcementForm.action_button_text}
                        onChangeText={(text) => setAnnouncementForm(prev => ({ ...prev, action_button_text: text }))}
                        className="text-gray-900 text-base"
                        placeholderTextColor="#9CA3AF"
                        maxLength={50}
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                      <TextInput
                        placeholder="Button URL"
                        value={announcementForm.action_button_url}
                        onChangeText={(text) => setAnnouncementForm(prev => ({ ...prev, action_button_url: text }))}
                        className="text-gray-900 text-base"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="url"
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Publish Immediately Toggle */}
              <View className="flex-row items-center justify-between py-4 mb-4 border-t border-gray-200">
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold">Publish Immediately</Text>
                  <Text className="text-gray-500 text-sm">Make announcement visible right away</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAnnouncementForm(prev => ({ ...prev, published: !prev.published }))}
                  className={`w-12 h-6 rounded-full border-2 ${
                    announcementForm.published ? 'bg-purple-600 border-purple-600' : 'bg-gray-200 border-gray-300'
                  }`}
                >
                  <View
                    className={`w-5 h-5 bg-white rounded-full shadow ${
                      announcementForm.published ? 'ml-5' : 'ml-0'
                    }`}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row space-x-3 pt-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={() => setShowAnnouncementModal(false)}
                className="flex-1 bg-gray-100 rounded-xl py-4"
              >
                <Text className="text-gray-700 font-medium text-center">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateAnnouncement}
                disabled={isCreatingAnnouncement}
                className={`flex-1 rounded-xl py-4 ${isCreatingAnnouncement ? 'bg-gray-300' : 'bg-purple-600'}`}
              >
                <Text className="text-white font-medium text-center">
                  {isCreatingAnnouncement ? 'Creating...' : 'Create Announcement'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};