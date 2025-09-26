import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker from '@react-native-documents/picker';
import Icon from 'react-native-vector-icons/Feather';
import { fileService, FileUploadResponse, FileUploadProgress } from '../../services/api/fileService';

interface FileUploadProps {
  onUploadComplete?: (files: FileUploadResponse[]) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: FileUploadProgress) => void;
  taskId?: string;
  channelId?: string;
  maxFiles?: number;
  allowedTypes?: string[];
  maxFileSize?: number; // in bytes
  disabled?: boolean;
  children?: React.ReactNode;
  style?: any;
}

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  error?: string;
  completed?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  taskId,
  channelId,
  maxFiles = 10,
  allowedTypes,
  maxFileSize = 100 * 1024 * 1024, // 100MB default
  disabled = false,
  children,
  style,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file: any): string | null => {
    // Check file size
    if (file.size && file.size > maxFileSize) {
      return `File "${file.name}" is too large. Maximum size is ${fileService.formatFileSize(maxFileSize)}.`;
    }

    // Check file type
    if (allowedTypes && allowedTypes.length > 0) {
      const fileType = file.type || 'application/octet-stream';
      if (!allowedTypes.includes(fileType)) {
        return `File type "${fileType}" is not allowed.`;
      }
    }

    // Check if file type is supported
    const fileType = file.type || 'application/octet-stream';
    if (!fileService.isFileTypeSupported(fileType)) {
      return `File type "${fileType}" is not supported.`;
    }

    return null;
  };

  const handleFilePick = useCallback(async () => {
    if (disabled || isUploading) return;

    try {
      const result = await DocumentPicker.pick({
        type: allowedTypes || [DocumentPicker.types.allFiles],
        allowMultiSelection: maxFiles > 1,
      });

      const files = Array.isArray(result) ? result : [result];

      // Validate files
      const errors: string[] = [];
      const validFiles: any[] = [];

      for (const file of files) {
        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          validFiles.push(file);
        }
      }

      // Show validation errors
      if (errors.length > 0) {
        Alert.alert('Invalid Files', errors.join('\n\n'));
      }

      // If no valid files, return
      if (validFiles.length === 0) return;

      // Check total file count
      if (validFiles.length > maxFiles) {
        Alert.alert(
          'Too Many Files',
          `You can only upload ${maxFiles} file${maxFiles > 1 ? 's' : ''} at a time.`
        );
        return;
      }

      await uploadFiles(validFiles);
    } catch (error: any) {
      if (error?.code === 'cancelled') {
        // User cancelled the picker
        console.log('File picker cancelled');
      } else {
        console.error('File picker error:', error);
        onUploadError?.('Failed to pick files. Please try again.');
      }
    }
  }, [disabled, isUploading, maxFiles, allowedTypes, maxFileSize]);

  const uploadFiles = async (files: any[]) => {
    setIsUploading(true);

    // Initialize uploading files state
    const uploadingFilesState: UploadingFile[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      progress: 0,
    }));

    setUploadingFiles(uploadingFilesState);

    const uploadedFiles: FileUploadResponse[] = [];
    const errors: string[] = [];

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadingFile = uploadingFilesState[i];

        try {
          const response = await fileService.uploadFile(file, {
            taskId,
            channelId,
            onProgress: (progress) => {
              setUploadingFiles(prev =>
                prev.map(f =>
                  f.id === uploadingFile.id
                    ? { ...f, progress: progress.percentage }
                    : f
                )
              );
              onUploadProgress?.(progress);
            },
          });

          // Mark as completed
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id
                ? { ...f, progress: 100, completed: true }
                : f
            )
          );

          uploadedFiles.push(response);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          errors.push(`Failed to upload "${file.name}": ${errorMessage}`);

          // Mark as error
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id
                ? { ...f, error: errorMessage }
                : f
            )
          );
        }
      }

      // Report results
      if (uploadedFiles.length > 0) {
        onUploadComplete?.(uploadedFiles);
      }

      if (errors.length > 0) {
        onUploadError?.(errors.join('\n\n'));
      }

    } catch (error) {
      console.error('Upload process error:', error);
      onUploadError?.('Upload process failed. Please try again.');
    } finally {
      setIsUploading(false);

      // Clear uploading files after a delay
      setTimeout(() => {
        setUploadingFiles([]);
      }, 2000);
    }
  };

  const renderUploadProgress = () => {
    if (uploadingFiles.length === 0) return null;

    return (
      <View className="mt-4 space-y-2">
        {uploadingFiles.map((file) => (
          <View key={file.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-medium text-gray-900 flex-1" numberOfLines={1}>
                {file.name}
              </Text>
              <Text className="text-sm text-gray-500 ml-2">
                {fileService.formatFileSize(file.size)}
              </Text>
            </View>

            {file.error ? (
              <View className="flex-row items-center">
                <Icon name="alert-circle" size={16} color="#EF4444" />
                <Text className="text-red-600 text-sm ml-2 flex-1" numberOfLines={2}>
                  {file.error}
                </Text>
              </View>
            ) : file.completed ? (
              <View className="flex-row items-center">
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text className="text-green-600 text-sm ml-2">Upload complete</Text>
              </View>
            ) : (
              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">Uploading...</Text>
                  <Text className="text-sm text-gray-600">{file.progress}%</Text>
                </View>
                <View className="w-full bg-gray-200 rounded-full h-2">
                  <View
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${file.progress}%` }}
                  />
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  // Custom children or default upload button
  const renderUploadTrigger = () => {
    if (children) {
      return (
        <TouchableOpacity
          onPress={handleFilePick}
          disabled={disabled || isUploading}
          activeOpacity={0.8}
          style={style}
        >
          {children}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={handleFilePick}
        disabled={disabled || isUploading}
        className={`
          border-2 border-dashed border-gray-300 rounded-lg p-6 items-center justify-center
          ${disabled || isUploading ? 'opacity-50' : 'hover:border-gray-400'}
          ${style || ''}
        `}
        activeOpacity={0.8}
      >
        <View className="items-center">
          {isUploading ? (
            <ActivityIndicator size="large" color="#3B82F6" />
          ) : (
            <Icon name="upload-cloud" size={48} color="#9CA3AF" />
          )}

          <Text className="text-gray-600 font-medium mt-2 mb-1">
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Text>

          <Text className="text-gray-400 text-sm text-center">
            {isUploading
              ? 'Please wait while files are being uploaded'
              : `Tap to select ${maxFiles > 1 ? 'files' : 'a file'} to upload`
            }
          </Text>

          {maxFileSize && (
            <Text className="text-gray-400 text-xs mt-2">
              Maximum file size: {fileService.formatFileSize(maxFileSize)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      {renderUploadTrigger()}
      {renderUploadProgress()}
    </View>
  );
};

// Preset configurations for common use cases
export const ImageUpload: React.FC<Omit<FileUploadProps, 'allowedTypes'>> = (props) => (
  <FileUpload
    {...props}
    allowedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
    maxFileSize={10 * 1024 * 1024} // 10MB for images
  />
);

export const DocumentUpload: React.FC<Omit<FileUploadProps, 'allowedTypes'>> = (props) => (
  <FileUpload
    {...props}
    allowedTypes={[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]}
  />
);

export const MediaUpload: React.FC<Omit<FileUploadProps, 'allowedTypes'>> = (props) => (
  <FileUpload
    {...props}
    allowedTypes={[
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
    ]}
    maxFileSize={500 * 1024 * 1024} // 500MB for media
  />
);