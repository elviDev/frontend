import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { fileService, TaskAttachment, FileUploadProgress } from '../../services/api/fileService';
import { useToast } from '../../contexts/ToastContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

interface TaskAttachmentsProps {
  taskId: string;
  attachments: TaskAttachment[];
  onAttachmentsChange: (attachments: TaskAttachment[]) => void;
  readonly?: boolean;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
}

export const TaskAttachments: React.FC<TaskAttachmentsProps> = ({
  taskId,
  attachments,
  onAttachmentsChange,
  readonly = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<TaskAttachment | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadAttachments();
  }, [taskId]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const response = await fileService.getTaskAttachments(taskId);
      onAttachmentsChange(response.data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
      toast.showError((error as Error).message || 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          await uploadFile({
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || 'application/octet-stream',
          });
        }
      }
    } catch (error) {
      toast.showError((error as Error).message || 'Failed to pick document');
    }
    setShowUploadOptions(false);
  };
  

  const handleImagePick = async (useCamera: boolean = false) => {
    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            quality: 0.8,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
            allowsEditing: false,
            allowsMultipleSelection: true,
          });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          await uploadFile({
            uri: asset.uri,
            name: asset.fileName || `image_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
          });
        }
      }
    } catch (error) {
      toast.showError((error as Error).message || 'Failed to pick image');
    }
    setShowUploadOptions(false);
  };

  const uploadFile = async (file: { uri: string; name: string; type: string }) => {
    // Validate file
    if (!fileService.isFileTypeSupported(file.type)) {
      toast.showError(`${file.type} files are not supported`);
      return;
    }

    // Start upload tracking
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    setUploadingFiles(prev => [
      ...prev,
      { id: uploadId, name: file.name, progress: 0 }
    ]);

    try {
      const response = await fileService.uploadFile(file, {
        taskId,
        onProgress: (progress: FileUploadProgress) => {
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadId ? { ...f, progress: progress.percentage } : f
            )
          );
        },
      });

      // Add as task attachment
      await fileService.addTaskAttachment(taskId, response.id);

      // Reload attachments
      await loadAttachments();

      toast.showSuccess(`${file.name} attached to task`);
    } catch (error) {
      toast.showError((error as Error).message || 'Upload failed');
    } finally {
      // Remove from uploading list
      setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
    }
  };

  const handleDeleteAttachment = async (attachment: TaskAttachment) => {
    Alert.alert(
      'Delete Attachment',
      `Are you sure you want to remove "${attachment.filename}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fileService.removeTaskAttachment(taskId, attachment.id);
              await loadAttachments();
              
              toast.showSuccess(`${attachment.filename} has been removed`);
            } catch (error) {
              toast.showError((error as Error).message || 'Failed to remove attachment');
            }
          }
        }
      ]
    );
  };

  const handleDownloadAttachment = async (attachment: TaskAttachment) => {
    try {
      if (attachment.downloadUrl) {
        const supported = await Linking.canOpenURL(attachment.downloadUrl);
        if (supported) {
          await Linking.openURL(attachment.downloadUrl);
          toast.showInfo(`Downloading ${attachment.filename}`);
        } else {
          toast.showError('Cannot open download URL');
        }
      } else {
        toast.showError('Download URL not available');
      }
    } catch (error) {
      toast.showError((error as Error).message || 'Download failed');
    }
  };

  const renderAttachmentItem = (attachment: TaskAttachment) => {
    const isImage = attachment.mimeType.startsWith('image/');
    const fileIcon = fileService.getFileIcon(attachment.mimeType);
    const fileSize = fileService.formatFileSize(attachment.size);

    return (
      <TouchableOpacity
        key={attachment.id}
        className="bg-white rounded-xl p-4 mb-3 shadow-sm"
        onPress={() => setSelectedAttachment(attachment)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          {isImage && attachment.thumbnailUrl ? (
            <Image
              source={{ uri: attachment.thumbnailUrl }}
              className="w-12 h-12 rounded-lg mr-3"
              resizeMode="cover"
            />
          ) : (
            <View className="w-12 h-12 bg-gray-100 rounded-lg mr-3 items-center justify-center">
              <Text className="text-2xl">{fileIcon}</Text>
            </View>
          )}

          <View className="flex-1">
            <Text className="text-gray-900 font-medium text-base mb-1" numberOfLines={1}>
              {attachment.originalName}
            </Text>
            <Text className="text-gray-500 text-sm mb-1">{fileSize}</Text>
            <Text className="text-gray-400 text-xs">
              Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()}
            </Text>
          </View>

          {!readonly && (
            <TouchableOpacity
              onPress={() => handleDeleteAttachment(attachment)}
              className="w-8 h-8 bg-red-50 rounded-full items-center justify-center ml-2"
            >
              <Text className="text-red-600 text-lg">×</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderUploadingItem = (file: UploadingFile) => (
    <View key={file.id} className="bg-blue-50 rounded-xl p-4 mb-3 border border-blue-200">
      <View className="flex-row items-center">
        <View className="w-12 h-12 bg-blue-100 rounded-lg mr-3 items-center justify-center">
          <ActivityIndicator color="#3B82F6" size="small" />
        </View>

        <View className="flex-1">
          <Text className="text-gray-900 font-medium text-base mb-1" numberOfLines={1}>
            {file.name}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-blue-600 text-sm mr-2">Uploading... {file.progress}%</Text>
          </View>
          
          {/* Progress Bar */}
          <View className="bg-blue-200 rounded-full h-2 mt-2">
            <View 
              className="bg-blue-500 rounded-full h-2"
              style={{ width: `${file.progress}%` }}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderUploadOptions = () => (
    <Modal
      visible={showUploadOptions}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowUploadOptions(false)}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6">
          <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />
          
          <Text className="text-gray-900 text-xl font-bold mb-6">Add Attachment</Text>
          
          <TouchableOpacity
            onPress={() => handleImagePick(true)}
            className="bg-gray-50 p-4 rounded-xl mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-4">📸</Text>
              <View>
                <Text className="text-gray-900 font-semibold text-base">Take Photo</Text>
                <Text className="text-gray-500 text-sm">Use camera to capture image</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleImagePick(false)}
            className="bg-gray-50 p-4 rounded-xl mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-4">🖼️</Text>
              <View>
                <Text className="text-gray-900 font-semibold text-base">Choose Images</Text>
                <Text className="text-gray-500 text-sm">Select from photo library</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDocumentPick}
            className="bg-gray-50 p-4 rounded-xl mb-6"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Text className="text-3xl mr-4">📄</Text>
              <View>
                <Text className="text-gray-900 font-semibold text-base">Choose Files</Text>
                <Text className="text-gray-500 text-sm">Documents, videos, and more</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowUploadOptions(false)}
            className="bg-gray-200 p-4 rounded-xl"
            activeOpacity={0.7}
          >
            <Text className="text-gray-900 font-semibold text-center">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAttachmentDetail = () => {
    if (!selectedAttachment) return null;

    const isImage = selectedAttachment.mimeType.startsWith('image/');

    return (
      <Modal
        visible={!!selectedAttachment}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedAttachment(null)}
      >
        <View className="flex-1 bg-black/90">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 mt-12">
            <TouchableOpacity
              onPress={() => setSelectedAttachment(null)}
              className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
            >
              <Text className="text-white text-xl">×</Text>
            </TouchableOpacity>
            
            <View className="flex-1 mx-4">
              <Text className="text-white font-semibold text-lg" numberOfLines={1}>
                {selectedAttachment.originalName}
              </Text>
              <Text className="text-white/70 text-sm">
                {fileService.formatFileSize(selectedAttachment.size)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => handleDownloadAttachment(selectedAttachment)}
              className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
            >
              <Text className="text-white text-xl">↓</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1 items-center justify-center">
            {isImage ? (
              <Image
                source={{ uri: selectedAttachment.url }}
                style={{ width: width - 40, height: width - 40 }}
                resizeMode="contain"
              />
            ) : (
              <View className="bg-white/10 rounded-2xl p-8 items-center">
                <Text className="text-6xl mb-4">
                  {fileService.getFileIcon(selectedAttachment.mimeType)}
                </Text>
                <Text className="text-white font-semibold text-xl mb-2">
                  {selectedAttachment.originalName}
                </Text>
                <Text className="text-white/70 text-center mb-6">
                  {fileService.formatFileSize(selectedAttachment.size)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDownloadAttachment(selectedAttachment)}
                  className="bg-white/20 px-6 py-3 rounded-xl"
                >
                  <Text className="text-white font-semibold">Download</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && attachments.length === 0) {
    return (
      <View className="py-6">
        <View className="flex-row items-center mb-4">
          <Text className="text-gray-900 font-semibold text-lg">Attachments</Text>
        </View>
        <View className="items-center py-8">
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      </View>
    );
  }

  return (
    <View className="py-6">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-gray-900 font-semibold text-lg">
          Attachments {attachments.length > 0 && `(${attachments.length})`}
        </Text>
        {!readonly && (
          <TouchableOpacity
            onPress={() => setShowUploadOptions(true)}
            className="bg-blue-500 px-4 py-2 rounded-lg"
            activeOpacity={0.7}
          >
            <Text className="text-white font-semibold">Add Files</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Uploading files */}
        {uploadingFiles.map(renderUploadingItem)}

        {/* Existing attachments */}
        {attachments.map(renderAttachmentItem)}

        {/* Empty state */}
        {attachments.length === 0 && uploadingFiles.length === 0 && (
          <View className="bg-gray-50 rounded-xl p-8 items-center">
            <Text className="text-4xl mb-2">📎</Text>
            <Text className="text-gray-500 font-medium mb-1">No attachments</Text>
            <Text className="text-gray-400 text-center text-sm">
              {readonly 
                ? 'This task has no attached files'
                : 'Add files to share with your team'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Upload options modal */}
      {renderUploadOptions()}

      {/* Attachment detail modal */}
      {renderAttachmentDetail()}
    </View>
  );
};