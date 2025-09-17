import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import Animated, { FadeInDown, SlideInRight, BounceIn } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface Deliverable {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface SuccessCriteria {
  id: string;
  criteria: string;
  met: boolean;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  uri: string;
  size?: number;
}

interface TaskRequirementsProps {
  features: string[];
  deliverables: Deliverable[];
  successCriteria: SuccessCriteria[];
  documentLinks: string[];
  attachments: Attachment[];
  onAddFeature: (feature: string) => void;
  onRemoveFeature: (feature: string) => void;
  onAddDeliverable: (title: string, description: string) => void;
  onRemoveDeliverable: (id: string) => void;
  onAddSuccessCriteria: (criteria: string) => void;
  onRemoveSuccessCriteria: (id: string) => void;
  onAddDocumentLink: (link: string) => void;
  onRemoveDocumentLink: (link: string) => void;
  onPickDocuments: () => void;
  onRemoveAttachment: (id: string) => void;
}

export const TaskRequirements: React.FC<TaskRequirementsProps> = ({
  features,
  deliverables,
  successCriteria,
  documentLinks,
  attachments,
  onAddFeature,
  onRemoveFeature,
  onAddDeliverable,
  onRemoveDeliverable,
  onAddSuccessCriteria,
  onRemoveSuccessCriteria,
  onAddDocumentLink,
  onRemoveDocumentLink,
  onPickDocuments,
  onRemoveAttachment,
}) => {
  const [inputs, setInputs] = React.useState({
    feature: '',
    deliverableTitle: '',
    deliverableDescription: '',
    criteria: '',
    link: '',
  });

  const updateInput = (field: keyof typeof inputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleAddFeature = () => {
    const feature = inputs.feature.trim();
    if (feature && !features.includes(feature)) {
      onAddFeature(feature);
      updateInput('feature', '');
    }
  };

  const handleAddDeliverable = () => {
    if (inputs.deliverableTitle.trim() && inputs.deliverableDescription.trim()) {
      onAddDeliverable(inputs.deliverableTitle.trim(), inputs.deliverableDescription.trim());
      updateInput('deliverableTitle', '');
      updateInput('deliverableDescription', '');
    }
  };

  const handleAddCriteria = () => {
    const criteria = inputs.criteria.trim();
    if (criteria) {
      onAddSuccessCriteria(criteria);
      updateInput('criteria', '');
    }
  };

  const handleAddLink = () => {
    const link = inputs.link.trim();
    if (link && !documentLinks.includes(link)) {
      onAddDocumentLink(link);
      updateInput('link', '');
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Animated.View entering={FadeInDown.duration(600)} className="gap-6 flex-col">
      {/* Features */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="checklist" size={20} color="#3B82F6" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">Feature Requirements</Text>
            <Text className="text-gray-500 text-sm">List the key features needed</Text>
          </View>
        </View>

        <View className="flex-row mb-4">
          <View className="flex-1 border-2 border-gray-200 rounded-xl p-3 bg-white mr-3">
            <TextInput
              placeholder="Enter a feature requirement..."
              value={inputs.feature}
              onChangeText={(text) => updateInput('feature', text)}
              onSubmitEditing={handleAddFeature}
              className="text-gray-900 text-base"
              placeholderTextColor="#9CA3AF"
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            onPress={handleAddFeature}
            className="bg-blue-600 rounded-xl px-4 justify-center"
          >
            <MaterialIcon name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {features.length > 0 && (
          <View className="space-y-2">
            {features.map((feature, index) => (
              <Animated.View
                key={index}
                entering={SlideInRight.delay(index * 100)}
                className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex-row items-center"
              >
                <MaterialIcon name="fiber-manual-record" size={12} color="#3B82F6" />
                <Text className="text-blue-800 ml-2 flex-1 font-medium">{feature}</Text>
                <TouchableOpacity onPress={() => onRemoveFeature(feature)}>
                  <MaterialIcon name="delete" size={18} color="#EF4444" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {/* Deliverables */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-green-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="inventory" size={20} color="#10B981" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">Deliverables</Text>
            <Text className="text-gray-500 text-sm">What will be produced?</Text>
          </View>
        </View>

        <View className="gap-4 mb-4">
          <View className="border-2 border-gray-200 rounded-xl p-3 bg-white">
            <TextInput
              placeholder="Deliverable title..."
              value={inputs.deliverableTitle}
              onChangeText={(text) => updateInput('deliverableTitle', text)}
              className="text-gray-900 text-base font-medium mb-2"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              placeholder="Description..."
              value={inputs.deliverableDescription}
              onChangeText={(text) => updateInput('deliverableDescription', text)}
              className="text-gray-900 text-sm"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
            />
          </View>
          <TouchableOpacity
            onPress={handleAddDeliverable}
            className="bg-green-600 rounded-xl py-3 flex-row items-center justify-center"
          >
            <MaterialIcon name="add" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Add Deliverable</Text>
          </TouchableOpacity>
        </View>

        {deliverables.length > 0 && (
          <View className="space-y-3">
            {deliverables.map((deliverable, index) => (
              <Animated.View
                key={deliverable.id}
                entering={BounceIn.delay(index * 100)}
                className="bg-green-50 border border-green-200 rounded-xl p-4"
              >
                <View className="flex-row items-start justify-between mb-2">
                  <Text className="text-green-800 font-semibold flex-1">
                    {deliverable.title}
                  </Text>
                  <TouchableOpacity onPress={() => onRemoveDeliverable(deliverable.id)}>
                    <MaterialIcon name="delete" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <Text className="text-green-700 text-sm">
                  {deliverable.description}
                </Text>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {/* Success Criteria */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-yellow-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="task-alt" size={20} color="#F59E0B" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">Success Criteria</Text>
            <Text className="text-gray-500 text-sm">How will success be measured?</Text>
          </View>
        </View>

        <View className="flex-row mb-4">
          <View className="flex-1 border-2 border-gray-200 rounded-xl p-3 bg-white mr-3">
            <TextInput
              placeholder="Define what success looks like..."
              value={inputs.criteria}
              onChangeText={(text) => updateInput('criteria', text)}
              onSubmitEditing={handleAddCriteria}
              className="text-gray-900 text-base"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>
          <TouchableOpacity
            onPress={handleAddCriteria}
            className="bg-yellow-600 rounded-xl px-4 justify-center"
          >
            <MaterialIcon name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {successCriteria.length > 0 && (
          <View className="space-y-2">
            {successCriteria.map((criteria, index) => (
              <Animated.View
                key={criteria.id}
                entering={SlideInRight.delay(index * 100)}
                className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex-row items-center"
              >
                <MaterialIcon name="star" size={16} color="#F59E0B" />
                <Text className="text-yellow-800 ml-2 flex-1 font-medium">
                  {criteria.criteria}
                </Text>
                <TouchableOpacity onPress={() => onRemoveSuccessCriteria(criteria.id)}>
                  <MaterialIcon name="delete" size={18} color="#EF4444" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {/* Document Links */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-purple-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="link" size={20} color="#8B5CF6" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">Document Links</Text>
            <Text className="text-gray-500 text-sm">Reference materials and documentation</Text>
          </View>
        </View>

        <View className="flex-row mb-4">
          <View className="flex-1 border-2 border-gray-200 rounded-xl p-3 bg-white mr-3">
            <TextInput
              placeholder="Paste document URL..."
              value={inputs.link}
              onChangeText={(text) => updateInput('link', text)}
              onSubmitEditing={handleAddLink}
              className="text-gray-900 text-base"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
          <TouchableOpacity
            onPress={handleAddLink}
            className="bg-purple-600 rounded-xl px-4 justify-center"
          >
            <MaterialIcon name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {documentLinks.length > 0 && (
          <View className="space-y-2">
            {documentLinks.map((link, index) => (
              <Animated.View
                key={index}
                entering={BounceIn.delay(index * 100)}
                className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex-row items-center"
              >
                <MaterialIcon name="insert-link" size={16} color="#8B5CF6" />
                <Text
                  className="text-purple-800 ml-2 flex-1 font-medium"
                  numberOfLines={1}
                >
                  {link}
                </Text>
                <TouchableOpacity onPress={() => onRemoveDocumentLink(link)}>
                  <MaterialIcon name="delete" size={18} color="#EF4444" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {/* File Attachments */}
      <View>
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-gray-100 rounded-xl items-center justify-center mr-3">
            <MaterialIcon name="attach-file" size={20} color="#6B7280" />
          </View>
          <View>
            <Text className="text-gray-900 font-bold text-lg">File Attachments</Text>
            <Text className="text-gray-500 text-sm">Upload relevant files and assets</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onPickDocuments}
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 items-center mb-4 bg-gray-50"
        >
          <MaterialIcon name="cloud-upload" size={32} color="#9CA3AF" />
          <Text className="text-gray-600 font-medium mt-2">Tap to upload files</Text>
          <Text className="text-gray-400 text-sm">
            Images, documents, or any relevant files
          </Text>
        </TouchableOpacity>

        {attachments.length > 0 && (
          <View className="space-y-2">
            {attachments.map((attachment, index) => (
              <Animated.View
                key={attachment.id}
                entering={SlideInRight.delay(index * 100)}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex-row items-center"
              >
                <MaterialIcon name="insert-drive-file" size={20} color="#6B7280" />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-900 font-medium" numberOfLines={1}>
                    {attachment.name}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {attachment.type} • {formatFileSize(attachment.size)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => onRemoveAttachment(attachment.id)}>
                  <MaterialIcon name="delete" size={18} color="#EF4444" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};