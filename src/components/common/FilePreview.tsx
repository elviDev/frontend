import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { fileService, FileUploadResponse, TaskAttachment } from '../../services/api/fileService';

interface FilePreviewProps {
  file: FileUploadResponse | TaskAttachment;
  showActions?: boolean;
  onDelete?: () => void;
  onDownload?: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

interface FilePreviewModalProps {
  visible: boolean;
  file: FileUploadResponse | TaskAttachment;
  onClose: () => void;
  onDelete?: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  showActions = true,
  onDelete,
  onDownload,
  size = 'medium',
  style,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isImage = fileService.getFileCategory(file.mimeType) === 'images';
  const fileIcon = fileService.getFileIcon(file.mimeType);
  const formattedSize = fileService.formatFileSize(file.size);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.originalName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(),
        },
      ]
    );
  };

  const handleDownload = async () => {
    if (!onDownload) {
      try {
        setIsLoading(true);
        const downloadUrl = await fileService.getDownloadUrl(file.id);

        if (downloadUrl) {
          // Log download URL for debugging
          console.log('Download URL:', downloadUrl);

          // For React Native, you'd use a file download library
          // For now, just show an alert with the URL
          Alert.alert('Download Ready', 'File download functionality needs to be implemented for mobile.');
        }
      } catch (error) {
        console.error('Download failed:', error);
        Alert.alert('Download Failed', 'Unable to download the file. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      onDownload();
    }
  };

  return (
    <>
      <View className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${style || ''}`}>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
          className="flex-row items-center p-3"
        >
          {/* File Preview/Icon */}
          <View className={`${sizeClasses[size]} mr-3 rounded-lg overflow-hidden bg-gray-100 items-center justify-center`}>
            {isImage && file.thumbnailUrl ? (
              <Image
                source={{ uri: file.thumbnailUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : isImage && file.url ? (
              <Image
                source={{ uri: file.url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-2xl">{fileIcon}</Text>
            )}
          </View>

          {/* File Info */}
          <View className="flex-1">
            <Text
              className="font-medium text-gray-900 mb-1"
              numberOfLines={2}
            >
              {file.originalName}
            </Text>
            <Text className="text-sm text-gray-500 mb-1">
              {formattedSize}
            </Text>
            <Text className="text-xs text-gray-400">
              {new Date(file.uploadedAt).toLocaleDateString()}
            </Text>
          </View>

          {/* Actions */}
          {showActions && (
            <View className="flex-row ml-2">
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="p-2 bg-blue-100 rounded-lg mr-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Icon name="download" size={16} color="#3B82F6" />
                )}
              </TouchableOpacity>

              {onDelete && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="p-2 bg-red-100 rounded-lg"
                >
                  <Icon name="trash-2" size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Preview Modal */}
      <FilePreviewModal
        visible={showModal}
        file={file}
        onClose={() => setShowModal(false)}
        onDelete={onDelete}
      />
    </>
  );
};

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  visible,
  file,
  onClose,
  onDelete,
}) => {
  const isImage = fileService.getFileCategory(file.mimeType) === 'images';
  const isDocument = fileService.getFileCategory(file.mimeType) === 'documents';
  const fileIcon = fileService.getFileIcon(file.mimeType);
  const formattedSize = fileService.formatFileSize(file.size);

  const handleDelete = () => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.originalName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="bg-black/80 absolute top-0 left-0 right-0 z-10 pt-12 pb-4 px-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={onClose}
              className="p-2 bg-white/20 rounded-full"
            >
              <Icon name="x" size={24} color="white" />
            </TouchableOpacity>

            <View className="flex-1 mx-4">
              <Text className="text-white font-medium text-center" numberOfLines={1}>
                {file.originalName}
              </Text>
            </View>

            <View className="flex-row">
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const downloadUrl = await fileService.getDownloadUrl(file.id);
                    if (downloadUrl && typeof window !== 'undefined') {
                      const link = document.createElement('a');
                      link.href = downloadUrl;
                      link.download = file.originalName;
                      link.click();
                    }
                  } catch (error) {
                    Alert.alert('Download Failed', 'Unable to download the file.');
                  }
                }}
                className="p-2 bg-white/20 rounded-full mr-2"
              >
                <Icon name="download" size={20} color="white" />
              </TouchableOpacity>

              {onDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  className="p-2 bg-white/20 rounded-full"
                >
                  <Icon name="trash-2" size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center justify-center px-4">
            {isImage ? (
              <Image
                source={{ uri: file.url }}
                className="max-w-full max-h-full"
                resizeMode="contain"
              />
            ) : (
              <View className="items-center">
                <Text className="text-8xl mb-4">{fileIcon}</Text>
                <Text className="text-white text-xl font-medium mb-2 text-center">
                  {file.originalName}
                </Text>
                <Text className="text-gray-300 text-base mb-4">
                  {formattedSize} • {file.mimeType}
                </Text>
                {isDocument && (
                  <Text className="text-gray-400 text-center mb-6">
                    Preview not available for this file type
                  </Text>
                )}
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const downloadUrl = await fileService.getDownloadUrl(file.id);
                      if (downloadUrl) {
                        Alert.alert('Download Ready', 'File download functionality needs to be implemented for mobile.');
                      }
                    } catch (error) {
                      Alert.alert('Download Failed', 'Unable to download the file.');
                    }
                  }}
                  className="bg-blue-500 px-6 py-3 rounded-xl flex-row items-center"
                >
                  <Icon name="download" size={20} color="white" />
                  <Text className="text-white font-medium ml-2">Download File</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer Info */}
        <View className="bg-black/80 absolute bottom-0 left-0 right-0 p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-sm">
                Uploaded on {new Date(file.uploadedAt).toLocaleDateString()}
              </Text>
              {file.metadata?.width && file.metadata?.height && (
                <Text className="text-gray-300 text-xs">
                  {file.metadata.width} × {file.metadata.height} pixels
                </Text>
              )}
            </View>
            <View className="items-end">
              <Text className="text-gray-300 text-sm">{formattedSize}</Text>
              <Text className="text-gray-400 text-xs">{file.mimeType}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};