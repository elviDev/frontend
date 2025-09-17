import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
  Switch,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  selectAnnouncements,
  selectAnnouncementsLoading,
} from '../../store/slices/announcementSlice';
import { Announcement, CreateAnnouncementData } from '../../types/announcement.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface AnnouncementFormData {
  title: string;
  content: string;
  type: Announcement['type'];
  priority: Announcement['priority'];
  targetAudience: Announcement['targetAudience'];
  scheduledFor: Date | null;
  expiresAt: Date | null;
  actionButtonText: string;
  actionButtonUrl: string;
  imageUrl: string;
  published: boolean;
}

const initialFormData: AnnouncementFormData = {
  title: '',
  content: '',
  type: 'info',
  priority: 'medium',
  targetAudience: 'all',
  scheduledFor: null,
  expiresAt: null,
  actionButtonText: '',
  actionButtonUrl: '',
  imageUrl: '',
  published: false,
};

export const AdminAnnouncementManagement: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const announcements = useSelector(selectAnnouncements);
  const announcementsLoading = useSelector(selectAnnouncementsLoading);
  const toast = useToast();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormData>(initialFormData);
  const [filterType, setFilterType] = useState<Announcement['type'] | 'all'>('all');
  const [filterPublished, setFilterPublished] = useState<boolean | 'all'>('all');

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      await dispatch(fetchAnnouncements()).unwrap();
    } catch (error) {
      console.error('Failed to load announcements:', error);
      toast.showError('Failed to load announcements');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  };

  const handleCreateAnnouncement = async () => {
    if (!formData.title.trim()) {
      toast.showError('Announcement title is required');
      return;
    }
    if (!formData.content.trim()) {
      toast.showError('Announcement content is required');
      return;
    }

    try {
      const announcementData: CreateAnnouncementData = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        scheduledFor: formData.scheduledFor || undefined,
        expiresAt: formData.expiresAt || undefined,
        actionButton: formData.actionButtonText && formData.actionButtonUrl ? {
          text: formData.actionButtonText,
          url: formData.actionButtonUrl
        } : undefined,
        imageUrl: formData.imageUrl || undefined,
        published: formData.published,
      };

      await dispatch(createAnnouncement(announcementData)).unwrap();
      toast.showSuccess('Announcement created successfully');
      setShowCreateModal(false);
      setFormData(initialFormData);
      loadAnnouncements();
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Failed to create announcement');
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;

    try {
      await dispatch(updateAnnouncement({ 
        id: editingAnnouncement.id, 
        data: {
          title: formData.title,
          content: formData.content,
          type: formData.type,
          priority: formData.priority,
          targetAudience: formData.targetAudience,
          scheduledFor: formData.scheduledFor || undefined,
          expiresAt: formData.expiresAt || undefined,
          actionButton: formData.actionButtonText && formData.actionButtonUrl ? {
            text: formData.actionButtonText,
            url: formData.actionButtonUrl
          } : undefined,
          imageUrl: formData.imageUrl || undefined,
          published: formData.published,
        }
      })).unwrap();
      
      toast.showSuccess('Announcement updated successfully');
      setShowEditModal(false);
      setEditingAnnouncement(null);
      setFormData(initialFormData);
      loadAnnouncements();
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Failed to update announcement');
    }
  };

  const handleDeleteAnnouncement = (announcement: Announcement) => {
    Alert.alert(
      'Delete Announcement',
      `Are you sure you want to delete \"${announcement.title}\"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteAnnouncement(announcement.id)).unwrap();
              toast.showSuccess('Announcement deleted successfully');
              loadAnnouncements();
            } catch (error) {
              toast.showError('Failed to delete announcement');
            }
          }
        }
      ]
    );
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      targetAudience: announcement.targetAudience,
      scheduledFor: announcement.scheduledFor ? new Date(announcement.scheduledFor) : null,
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt) : null,
      actionButtonText: announcement.actionButton?.text || '',
      actionButtonUrl: announcement.actionButton?.url || '',
      imageUrl: announcement.imageUrl || '',
      published: announcement.published,
    });
    setShowEditModal(true);
  };

  const getTypeIcon = (type: Announcement['type']) => {
    switch (type) {
      case 'info': return 'info';
      case 'warning': return 'alert-triangle';
      case 'success': return 'check-circle';
      case 'error': return 'x-circle';
      case 'feature': return 'star';
      case 'maintenance': return 'tool';
      default: return 'bell';
    }
  };

  const getTypeColor = (type: Announcement['type']) => {
    switch (type) {
      case 'info': return '#3B82F6';
      case 'warning': return '#F59E0B';
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'feature': return '#8B5CF6';
      case 'maintenance': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#F97316';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesType = filterType === 'all' || announcement.type === filterType;
    const matchesPublished = filterPublished === 'all' || announcement.published === filterPublished;
    return matchesType && matchesPublished;
  });

  const AnnouncementForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <ScrollView className="flex-1 p-6">
      <Text className="text-lg font-bold mb-4">
        {isEdit ? 'Edit Announcement' : 'Create New Announcement'}
      </Text>

      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2">Title *</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          value={formData.title}
          onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
          placeholder="Announcement title"
        />
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2">Content *</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white h-32"
          value={formData.content}
          onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
          placeholder="Announcement content"
          multiline
          textAlignVertical="top"
        />
      </View>

      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-gray-700 font-medium mb-2">Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {(['info', 'warning', 'success', 'error', 'feature', 'maintenance'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  className={`px-3 py-2 rounded-lg mr-2 flex-row items-center ${
                    formData.type === type ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                  onPress={() => setFormData(prev => ({ ...prev, type }))}
                >
                  <Icon 
                    name={getTypeIcon(type)} 
                    size={16} 
                    color={formData.type === type ? '#3B82F6' : '#6B7280'} 
                  />
                  <Text className={`ml-2 capitalize ${
                    formData.type === type ? 'text-blue-700 font-medium' : 'text-gray-700'
                  }`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-gray-700 font-medium mb-2">Priority</Text>
          <View className="flex-row flex-wrap">
            {(['low', 'medium', 'high', 'critical'] as const).map(priority => (
              <TouchableOpacity
                key={priority}
                className={`px-3 py-2 rounded-lg mr-2 mb-2 ${
                  formData.priority === priority ? 'bg-blue-100' : 'bg-gray-100'
                }`}
                onPress={() => setFormData(prev => ({ ...prev, priority }))}
              >
                <Text className={`capitalize ${
                  formData.priority === priority ? 'text-blue-700 font-medium' : 'text-gray-700'
                }`}>
                  {priority}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="flex-1 ml-2">
          <Text className="text-gray-700 font-medium mb-2">Target Audience</Text>
          <View className="flex-row flex-wrap">
            {(['all', 'admins', 'developers', 'designers', 'managers'] as const).map(audience => (
              <TouchableOpacity
                key={audience}
                className={`px-3 py-2 rounded-lg mr-2 mb-2 ${
                  formData.targetAudience === audience ? 'bg-blue-100' : 'bg-gray-100'
                }`}
                onPress={() => setFormData(prev => ({ ...prev, targetAudience: audience }))}
              >
                <Text className={`capitalize ${
                  formData.targetAudience === audience ? 'text-blue-700 font-medium' : 'text-gray-700'
                }`}>
                  {audience}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2">Action Button (Optional)</Text>
        <View className="flex-row mb-2">
          <TextInput
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white mr-2"
            value={formData.actionButtonText}
            onChangeText={(text) => setFormData(prev => ({ ...prev, actionButtonText: text }))}
            placeholder="Button text"
          />
          <TextInput
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-white"
            value={formData.actionButtonUrl}
            onChangeText={(text) => setFormData(prev => ({ ...prev, actionButtonUrl: text }))}
            placeholder="Button URL"
          />
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2">Image URL (Optional)</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          value={formData.imageUrl}
          onChangeText={(text) => setFormData(prev => ({ ...prev, imageUrl: text }))}
          placeholder="https://example.com/image.jpg"
        />
      </View>

      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-gray-700 font-medium">Publish Immediately</Text>
        <Switch
          value={formData.published}
          onValueChange={(value) => setFormData(prev => ({ ...prev, published: value }))}
        />
      </View>

      <View className="flex-row justify-end mt-6">
        <TouchableOpacity
          className="bg-gray-100 px-4 py-2 rounded-lg mr-2"
          onPress={() => {
            if (isEdit) {
              setShowEditModal(false);
              setEditingAnnouncement(null);
            } else {
              setShowCreateModal(false);
            }
            setFormData(initialFormData);
          }}
        >
          <Text className="text-gray-700 font-medium">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={isEdit ? handleUpdateAnnouncement : handleCreateAnnouncement}
        >
          <Text className="text-white font-medium">
            {isEdit ? 'Update' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-gray-900 text-2xl font-bold">Announcements</Text>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="bg-blue-500 px-3 py-2 rounded-lg"
          >
            <Text className="text-white text-sm font-medium">+ New Announcement</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View className="flex-row mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-gray-600 text-sm mb-1">Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                <TouchableOpacity
                  className={`px-3 py-2 rounded-lg mr-2 ${filterType === 'all' ? 'bg-blue-100' : 'bg-gray-100'}`}
                  onPress={() => setFilterType('all')}
                >
                  <Text className={filterType === 'all' ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                    All
                  </Text>
                </TouchableOpacity>
                {(['info', 'warning', 'success', 'error', 'feature', 'maintenance'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    className={`px-3 py-2 rounded-lg mr-2 ${filterType === type ? 'bg-blue-100' : 'bg-gray-100'}`}
                    onPress={() => setFilterType(type)}
                  >
                    <Text className={`capitalize ${filterType === type ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-gray-600 text-sm">
            {filteredAnnouncements.length} announcement{filteredAnnouncements.length !== 1 ? 's' : ''}
          </Text>
          <View className="flex-row">
            <TouchableOpacity
              className={`px-3 py-1 rounded-lg mr-2 ${filterPublished === 'all' ? 'bg-blue-100' : 'bg-gray-100'}`}
              onPress={() => setFilterPublished('all')}
            >
              <Text className={`text-sm ${filterPublished === 'all' ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-3 py-1 rounded-lg mr-2 ${filterPublished === true ? 'bg-blue-100' : 'bg-gray-100'}`}
              onPress={() => setFilterPublished(true)}
            >
              <Text className={`text-sm ${filterPublished === true ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                Published
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`px-3 py-1 rounded-lg ${filterPublished === false ? 'bg-blue-100' : 'bg-gray-100'}`}
              onPress={() => setFilterPublished(false)}
            >
              <Text className={`text-sm ${filterPublished === false ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                Draft
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Announcement List */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {announcementsLoading ? (
          <LoadingSpinner size="large" />
        ) : filteredAnnouncements.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-6xl mb-4">📢</Text>
            <Text className="text-gray-500 text-lg font-medium mb-2">No announcements found</Text>
            <Text className="text-gray-400 text-center mb-6">
              Create your first announcement to communicate with your team
            </Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              className="bg-blue-500 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Create First Announcement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="px-4 pb-6">
            {filteredAnnouncements.map(announcement => (
              <View key={announcement.id} className="mb-4">
                <View className="bg-white rounded-xl p-4 shadow-sm">
                  {/* Header */}
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Icon 
                          name={getTypeIcon(announcement.type)} 
                          size={16} 
                          color={getTypeColor(announcement.type)} 
                        />
                        <Text className="text-gray-900 font-bold text-lg ml-2 flex-1">
                          {announcement.title}
                        </Text>
                        <View className="flex-row">
                          <View 
                            className="px-2 py-1 rounded-full mr-2"
                            style={{ backgroundColor: `${getPriorityColor(announcement.priority)}20` }}
                          >
                            <Text 
                              className="text-xs font-medium capitalize"
                              style={{ color: getPriorityColor(announcement.priority) }}
                            >
                              {announcement.priority}
                            </Text>
                          </View>
                          <View className={`px-2 py-1 rounded-full ${announcement.published ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <Text className={`text-xs font-medium ${announcement.published ? 'text-green-700' : 'text-gray-700'}`}>
                              {announcement.published ? 'Published' : 'Draft'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text className="text-gray-600 mb-3">{announcement.content}</Text>
                    </View>
                  </View>

                  {/* Image */}
                  {announcement.imageUrl && (
                    <Image 
                      source={{ uri: announcement.imageUrl }} 
                      className="w-full h-32 rounded-lg mb-3"
                      resizeMode="cover"
                    />
                  )}

                  {/* Action Button */}
                  {announcement.actionButton && (
                    <TouchableOpacity 
                      className="bg-blue-100 px-4 py-2 rounded-lg mb-3"
                      onPress={() => console.log('Navigate to:', announcement.actionButton?.url)}
                    >
                      <Text className="text-blue-700 font-medium text-center">
                        {announcement.actionButton.text}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Footer */}
                  <View className="flex-row items-center justify-between border-t border-gray-100 pt-3">
                    <View>
                      <Text className="text-gray-500 text-xs">
                        Target: {announcement.targetAudience}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {new Date(announcement.createdAt).toLocaleDateString()} • {announcement.readBy.length} views
                      </Text>
                    </View>
                    <View className="flex-row">
                      <TouchableOpacity
                        onPress={() => handleEditAnnouncement(announcement)}
                        className="bg-blue-100 p-2 rounded-lg mr-2"
                      >
                        <Icon name="edit" size={16} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteAnnouncement(announcement)}
                        className="bg-red-100 p-2 rounded-lg"
                      >
                        <Icon name="trash-2" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Announcement Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <AnnouncementForm />
      </Modal>

      {/* Edit Announcement Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <AnnouncementForm isEdit />
      </Modal>
    </View>
  );
};