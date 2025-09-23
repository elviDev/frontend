import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import type { MessageAttachment } from '../../types/message';

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

export const MessageAttachments: React.FC<MessageAttachmentsProps> = ({
  attachments,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): string => {
    switch (type) {
      case 'image': return 'image';
      case 'video': return 'play-circle';
      case 'audio': return 'audiotrack';
      default: return 'insert-drive-file';
    }
  };

  const renderImageAttachment = (attachment: MessageAttachment) => (
    <TouchableOpacity
      key={attachment.id}
      className="mb-2 rounded-lg overflow-hidden"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <Image
        source={{ uri: attachment.url }}
        className="w-64 h-48"
        resizeMode="cover"
      />
      <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
        <Text className="text-white text-sm font-medium" numberOfLines={1}>
          {attachment.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFileAttachment = (attachment: MessageAttachment) => (
    <TouchableOpacity
      key={attachment.id}
      className="flex-row items-center p-3 mb-2 bg-gray-50 rounded-lg border border-gray-200"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
        <MaterialIcon 
          name={getFileIcon(attachment.type)} 
          size={20} 
          color="#3B82F6" 
        />
      </View>
      <View className="flex-1">
        <Text className="font-medium text-gray-900 text-sm" numberOfLines={1}>
          {attachment.name}
        </Text>
        {attachment.size && (
          <Text className="text-gray-500 text-xs mt-0.5">
            {formatFileSize(attachment.size)}
          </Text>
        )}
      </View>
      <MaterialIcon name="download" size={20} color="#6B7280" />
    </TouchableOpacity>
  );

  if (attachments.length === 0) return null;

  const images = attachments.filter(a => a.type === 'image');
  const files = attachments.filter(a => a.type !== 'image');

  return (
    <View className="mt-2">
      {/* Images */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <View className="flex-row space-x-2">
            {images.map(renderImageAttachment)}
          </View>
        </ScrollView>
      )}

      {/* Files */}
      {files.map(renderFileAttachment)}
    </View>
  );
};