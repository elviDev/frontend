import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { FileUpload } from '../common/FileUpload';
import { FilePreview } from '../common/FilePreview';
import { fileService, TaskAttachment, FileUploadResponse } from '../../services/api/fileService';
import { useToast } from '../../contexts/ToastContext';

interface TaskAttachmentsProps {
  taskId: string;
  editable?: boolean;
  showUpload?: boolean;
  maxFiles?: number;
  style?: any;
}

export const TaskAttachments: React.FC<TaskAttachmentsProps> = ({
  taskId,
  editable = true,
  showUpload = true,
  maxFiles = 10,
  style,
}) => {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadAttachments();
  }, [taskId]);

  const loadAttachments = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const response = await fileService.getTaskAttachments(taskId);

      if (response.success) {
        setAttachments(response.data);
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
      showError('Failed to load attachments');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUploadComplete = async (files: FileUploadResponse[]) => {
    try {
      const newAttachments: TaskAttachment[] = [];

      for (const file of files) {
        const response = await fileService.addTaskAttachment(taskId, file.id);
        if (response.success) {
          newAttachments.push(response.data);
        }
      }

      if (newAttachments.length > 0) {
        setAttachments(prev => [...prev, ...newAttachments]);
        showSuccess(
          `${newAttachments.length} file${newAttachments.length > 1 ? 's' : ''} attached to task`
        );
      }
    } catch (error) {
      console.error('Failed to attach files:', error);
      showError('Failed to attach files to task');
      loadAttachments();
    }
  };

  const handleUploadError = (error: string) => {
    showError(error);
  };

  const handleDeleteFile = async (attachment: TaskAttachment) => {
    Alert.alert(
      'Delete File',
      `Remove "${attachment.originalName}" from this task?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await fileService.removeTaskAttachment(taskId, attachment.id);
              setAttachments(prev => prev.filter(a => a.id !== attachment.id));
              showSuccess('Attachment removed from task');
            } catch (error) {
              console.error('Failed to remove attachment:', error);
              showError('Failed to remove attachment');
              loadAttachments();
            }
          },
        },
      ]
    );
  };

  const renderAttachments = () => {
    if (attachments.length === 0) {
      return (
        <View className="py-8 items-center">
          <Icon name="paperclip" size={48} color="#9CA3AF" />
          <Text className="text-gray-500 text-lg font-medium mt-4 mb-2">
            No attachments
          </Text>
          <Text className="text-gray-400 text-center">
            {showUpload && editable
              ? 'Upload files to share documents, images, and other resources'
              : 'This task has no attached files'
            }
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadAttachments(true)}
          />
        }
      >
        <View className="space-y-3">
          {attachments.map((attachment) => (
            <FilePreview
              key={attachment.id}
              file={attachment}
              showActions={editable}
              onDelete={() => handleDeleteFile(attachment)}
              size="medium"
            />
          ))}
        </View>
      </ScrollView>
    );
  };

  const getAttachmentStats = () => {
    const totalSize = attachments.reduce((sum, attachment) => sum + attachment.size, 0);
    const fileTypes = new Set(attachments.map(a => fileService.getFileCategory(a.mimeType)));

    return {
      count: attachments.length,
      totalSize: fileService.formatFileSize(totalSize),
      types: Array.from(fileTypes),
    };
  };

  const stats = getAttachmentStats();

  return (
    <View className={`bg-white rounded-xl border border-gray-200 ${style || ''}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <Icon name="paperclip" size={20} color="#6B7280" />
          <Text className="font-semibold text-gray-900 ml-2">
            Attachments ({attachments.length})
          </Text>
        </View>

        {attachments.length > 0 && (
          <TouchableOpacity
            onPress={() => loadAttachments(true)}
            className="p-1"
          >
            <Icon name="refresh-cw" size={16} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      {attachments.length > 0 && (
        <View className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-600">
              {stats.count} file{stats.count !== 1 ? 's' : ''} • {stats.totalSize}
            </Text>
            {stats.types.length > 0 && (
              <Text className="text-sm text-gray-500 capitalize">
                {stats.types.join(', ')}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      <View className="p-4 min-h-48">
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-500">Loading attachments...</Text>
          </View>
        ) : (
          <>
            {/* Upload Area */}
            {showUpload && editable && (
              <View className="mb-6">
                <FileUpload
                  taskId={taskId}
                  maxFiles={maxFiles - attachments.length}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  disabled={attachments.length >= maxFiles}
                >
                  <View className="border-2 border-dashed border-gray-300 rounded-lg p-4 items-center justify-center">
                    <Icon name="upload" size={24} color="#9CA3AF" />
                    <Text className="text-gray-600 font-medium mt-2">
                      {attachments.length >= maxFiles
                        ? 'Maximum files reached'
                        : 'Add attachments'
                      }
                    </Text>
                    {attachments.length < maxFiles && (
                      <Text className="text-gray-400 text-sm">
                        Tap to upload files ({maxFiles - attachments.length} remaining)
                      </Text>
                    )}
                  </View>
                </FileUpload>
              </View>
            )}

            {/* Attachments List */}
            <View className="flex-1">
              {renderAttachments()}
            </View>
          </>
        )}
      </View>
    </View>
  );
};