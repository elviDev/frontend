import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import IonIcon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email?: string;
  department?: string;
  job_title?: string;
}


interface FormData {
  name: string;
  description: string;
  type: string;
  privacy: 'public' | 'private' | 'restricted';
  parent_id: string;
  tags: string[];
  color: string;
  settings: Record<string, any>;
  members: Member[];
}

interface FormErrors {
  name: string;
  type: string;
  privacy: string;
  members: string;
}

interface CreateChannelModalProps {
  visible: boolean;
  onClose: () => void;
  isEditMode: boolean;
  formData: FormData;
  formErrors: FormErrors;
  availableMembers: Member[];
  tagInput: string;
  onFormDataChange: (data: Partial<FormData>) => void;
  onFormErrorsChange: (errors: Partial<FormErrors>) => void;
  onTagInputChange: (text: string) => void;
  onSubmit: () => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onToggleMember: (member: Member) => void;
  onShowMemberSelector: () => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  visible,
  onClose,
  isEditMode,
  formData,
  formErrors,
  availableMembers,
  tagInput,
  onFormDataChange,
  onFormErrorsChange,
  onTagInputChange,
  onSubmit,
  onAddTag,
  onRemoveTag,
  onToggleMember,
  onShowMemberSelector,
}) => {
  const handleFieldChange = (field: keyof FormData, value: any) => {
    onFormDataChange({ [field]: value });
    if (formErrors[field as keyof FormErrors]) {
      onFormErrorsChange({ [field as keyof FormErrors]: '' });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Channel' : 'Create Channel'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Channel Name */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Channel Name *</Text>
              <View className={`bg-gray-50 rounded-xl px-4 py-3 border ${formErrors.name ? 'border-red-300' : 'border-gray-200'}`}>
                <TextInput
                  placeholder="Enter channel name"
                  value={formData.name}
                  onChangeText={(text) => handleFieldChange('name', text)}
                  className="text-gray-900 text-base"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {formErrors.name ? (
                <Text className="text-red-500 text-sm mt-1">{formErrors.name}</Text>
              ) : null}
            </View>

            {/* Description */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Description</Text>
              <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <TextInput
                  placeholder="What's this channel about?"
                  value={formData.description}
                  onChangeText={(text) => handleFieldChange('description', text)}
                  multiline
                  numberOfLines={3}
                  className="text-gray-900 text-base"
                  placeholderTextColor="#9CA3AF"
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
              </View>
            </View>

            {/* Channel Type */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Channel Type *</Text>
              <View className="space-y-2">
                {/* Project Channel */}
                <TouchableOpacity
                  onPress={() => handleFieldChange('type', 'project')}
                  className={`flex-row items-center p-4 rounded-xl border ${
                    formData.type === 'project'
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                    formData.type === 'project' ? 'bg-blue-500' : 'bg-blue-100'
                  }`}>
                    <IonIcon name="folder-outline" size={22} color={formData.type === 'project' ? 'white' : '#3B82F6'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${
                      formData.type === 'project' ? 'text-blue-700' : 'text-gray-900'
                    }`}>
                      Project
                    </Text>
                    <Text className="text-gray-500 text-sm">Collaborate on specific projects and initiatives</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    formData.type === 'project' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {formData.type === 'project' && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                </TouchableOpacity>

                {/* Department Channel */}
                <TouchableOpacity
                  onPress={() => handleFieldChange('type', 'department')}
                  className={`flex-row items-center p-4 rounded-xl border ${
                    formData.type === 'department'
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                    formData.type === 'department' ? 'bg-green-500' : 'bg-green-100'
                  }`}>
                    <IonIcon name="business-outline" size={22} color={formData.type === 'department' ? 'white' : '#10B981'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${
                      formData.type === 'department' ? 'text-green-700' : 'text-gray-900'
                    }`}>
                      Department
                    </Text>
                    <Text className="text-gray-500 text-sm">Department-wide communications and updates</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    formData.type === 'department' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                    {formData.type === 'department' && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                </TouchableOpacity>

                {/* Announcement Channel */}
                <TouchableOpacity
                  onPress={() => handleFieldChange('type', 'announcement')}
                  className={`flex-row items-center p-4 rounded-xl border ${
                    formData.type === 'announcement'
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                    formData.type === 'announcement' ? 'bg-amber-500' : 'bg-amber-100'
                  }`}>
                    <IonIcon name="megaphone-outline" size={22} color={formData.type === 'announcement' ? 'white' : '#F59E0B'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${
                      formData.type === 'announcement' ? 'text-amber-700' : 'text-gray-900'
                    }`}>
                      Announcement
                    </Text>
                    <Text className="text-gray-500 text-sm">Important company-wide announcements</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    formData.type === 'announcement' ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                  }`}>
                    {formData.type === 'announcement' && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                </TouchableOpacity>

                {/* Initiative Channel */}
                <TouchableOpacity
                  onPress={() => handleFieldChange('type', 'initiative')}
                  className={`flex-row items-center p-4 rounded-xl border ${
                    formData.type === 'initiative'
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                    formData.type === 'initiative' ? 'bg-indigo-500' : 'bg-indigo-100'
                  }`}>
                    <IonIcon name="rocket-outline" size={22} color={formData.type === 'initiative' ? 'white' : '#6366F1'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${
                      formData.type === 'initiative' ? 'text-indigo-700' : 'text-gray-900'
                    }`}>
                      Initiative
                    </Text>
                    <Text className="text-gray-500 text-sm">Strategic initiatives and company goals</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    formData.type === 'initiative' ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                  }`}>
                    {formData.type === 'initiative' && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                </TouchableOpacity>

                {/* Temporary Channel */}
                <TouchableOpacity
                  onPress={() => handleFieldChange('type', 'temporary')}
                  className={`flex-row items-center p-4 rounded-xl border ${
                    formData.type === 'temporary'
                      ? 'bg-gray-100 border-gray-400'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                    formData.type === 'temporary' ? 'bg-gray-500' : 'bg-gray-200'
                  }`}>
                    <IonIcon name="time-outline" size={22} color={formData.type === 'temporary' ? 'white' : '#6B7280'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${
                      formData.type === 'temporary' ? 'text-gray-700' : 'text-gray-900'
                    }`}>
                      Temporary
                    </Text>
                    <Text className="text-gray-500 text-sm">Short-term discussions and events</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    formData.type === 'temporary' ? 'border-gray-500 bg-gray-500' : 'border-gray-300'
                  }`}>
                    {formData.type === 'temporary' && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                </TouchableOpacity>

                {/* Emergency Channel */}
                <TouchableOpacity
                  onPress={() => handleFieldChange('type', 'emergency')}
                  className={`flex-row items-center p-4 rounded-xl border ${
                    formData.type === 'emergency'
                      ? 'bg-red-50 border-red-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
                    formData.type === 'emergency' ? 'bg-red-500' : 'bg-red-100'
                  }`}>
                    <IonIcon name="alert-circle-outline" size={22} color={formData.type === 'emergency' ? 'white' : '#EF4444'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${
                      formData.type === 'emergency' ? 'text-red-700' : 'text-gray-900'
                    }`}>
                      Emergency
                    </Text>
                    <Text className="text-gray-500 text-sm">Critical communications and urgent matters</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    formData.type === 'emergency' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                  }`}>
                    {formData.type === 'emergency' && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                </TouchableOpacity>
              </View>
              {formErrors.type ? (
                <Text className="text-red-500 text-sm mt-1">{formErrors.type}</Text>
              ) : null}
            </View>

            {/* Tags */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Tags</Text>
              
              {/* Current Tags */}
              {formData.tags.length > 0 && (
                <View className="flex-row flex-wrap mb-3">
                  {formData.tags.map((tag, index) => (
                    <View key={index} className="bg-purple-100 rounded-full px-3 py-1 mr-2 mb-2 flex-row items-center">
                      <Text className="text-purple-700 text-sm">#{tag}</Text>
                      <TouchableOpacity onPress={() => onRemoveTag(tag)} className="ml-2">
                        <Feather name="x" size={14} color="#7C3AED" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Tag Input */}
              <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex-row items-center">
                <TextInput
                  placeholder="Type a tag and press Enter"
                  value={tagInput}
                  onChangeText={onTagInputChange}
                  onSubmitEditing={onAddTag}
                  className="text-gray-900 text-base flex-1"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                />
                {tagInput.trim() && (
                  <TouchableOpacity onPress={onAddTag} className="ml-2">
                    <Feather name="plus" size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Privacy */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Privacy *</Text>
              <View className="space-y-3">
                <TouchableOpacity 
                  onPress={() => handleFieldChange('privacy', 'public')}
                  className="flex-row items-center p-3 bg-gray-50 rounded-xl"
                >
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                    formData.privacy === 'public' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                  }`}>
                    {formData.privacy === 'public' && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">Public</Text>
                    <Text className="text-gray-500 text-sm">Anyone in the workspace can join</Text>
                  </View>
                  <IonIcon name="globe-outline" size={20} color="#10B981" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => handleFieldChange('privacy', 'private')}
                  className="flex-row items-center p-3 bg-gray-50 rounded-xl"
                >
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                    formData.privacy === 'private' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                  }`}>
                    {formData.privacy === 'private' && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">Private</Text>
                    <Text className="text-gray-500 text-sm">Only invited members can join</Text>
                  </View>
                  <MaterialIcon name="lock" size={20} color="#F59E0B" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => handleFieldChange('privacy', 'restricted')}
                  className="flex-row items-center p-3 bg-gray-50 rounded-xl"
                >
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                    formData.privacy === 'restricted' ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                  }`}>
                    {formData.privacy === 'restricted' && <View className="w-2 h-2 rounded-full bg-white" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">Restricted</Text>
                    <Text className="text-gray-500 text-sm">Admin approval required to join</Text>
                  </View>
                  <MaterialIcon name="admin-panel-settings" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              {formErrors.privacy ? (
                <Text className="text-red-500 text-sm mt-1">{formErrors.privacy}</Text>
              ) : null}
            </View>

            {/* Members */}
            <View className="mb-8">
              <Text className="text-gray-700 font-medium mb-2">Members ({formData.members.length})</Text>
              
              {/* Current Members */}
              {formData.members.length > 0 && (
                <View className="mb-3">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row space-x-2">
                      {formData.members.map((member) => {
                        const isCurrentUser = availableMembers.length > 0 && member.id === availableMembers[0].id;
                        return (
                          <View key={member.id} className="bg-purple-50 rounded-xl px-3 py-2 flex-row items-center">
                            <View className="w-6 h-6 bg-purple-600 rounded-full items-center justify-center mr-2">
                              <Text className="text-white text-xs font-bold">
                                {typeof member.avatar === 'string' && member.avatar.length === 1 
                                  ? member.avatar 
                                  : member.name.charAt(0).toUpperCase()
                                }
                              </Text>
                            </View>
                            <Text className="text-purple-700 text-sm font-medium">{member.name}</Text>
                            {!isCurrentUser && (
                              <TouchableOpacity onPress={() => onToggleMember(member)} className="ml-2">
                                <Feather name="x" size={14} color="#7C3AED" />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity 
                onPress={onShowMemberSelector}
                className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex-row items-center"
              >
                <Feather name="plus" size={20} color="#8B5CF6" />
                <Text className="text-purple-600 font-medium ml-2">Add team members</Text>
              </TouchableOpacity>
              
              {formErrors.members ? (
                <Text className="text-red-500 text-sm mt-1">{formErrors.members}</Text>
              ) : null}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View className="flex-row space-x-3 pt-4 border-t border-gray-200">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-100 rounded-xl py-4"
            >
              <Text className="text-gray-700 font-medium text-center">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSubmit}
              className="flex-1 bg-purple-600 rounded-xl py-4"
            >
              <Text className="text-white font-medium text-center">
                {isEditMode ? 'Update Channel' : 'Create Channel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};