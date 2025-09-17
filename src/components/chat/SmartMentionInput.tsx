import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Avatar } from '../common/Avatar';

interface MentionSuggestion {
  id: string;
  type: 'user' | 'channel' | 'message' | 'task';
  name: string;
  displayName: string;
  avatar?: string;
  role?: string;
  channel?: string;
  preview?: string;
}

interface SmartMentionInputProps {
  visible: boolean;
  onClose: () => void;
  onMentionSelect: (mention: MentionSuggestion) => void;
  searchQuery: string;
  members: any[];
  channels: any[];
  recentMessages: any[];
  tasks: any[];
}

export const SmartMentionInput: React.FC<SmartMentionInputProps> = ({
  visible,
  onClose,
  onMentionSelect,
  searchQuery,
  members,
  channels,
  recentMessages,
  tasks,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'channels' | 'messages' | 'tasks'>('all');

  const getAllSuggestions = (): MentionSuggestion[] => {
    const suggestions: MentionSuggestion[] = [];

    // Add users
    members.forEach(member => {
      if (member.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        suggestions.push({
          id: member.id,
          type: 'user',
          name: member.name,
          displayName: member.name,
          avatar: member.avatar,
          role: member.role,
        });
      }
    });

    // Add channels
    channels.forEach(channel => {
      if (channel.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        suggestions.push({
          id: channel.id,
          type: 'channel',
          name: channel.name,
          displayName: `#${channel.name}`,
          preview: channel.description,
        });
      }
    });

    // Add recent messages
    recentMessages.forEach(message => {
      if (message.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        suggestions.push({
          id: message.id,
          type: 'message',
          name: message.id,
          displayName: `Message from ${message.sender.name}`,
          avatar: message.sender.avatar,
          preview: message.content.slice(0, 100),
          channel: message.channel,
        });
      }
    });

    // Add tasks
    tasks.forEach(task => {
      if (task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        suggestions.push({
          id: task.id,
          type: 'task',
          name: task.title,
          displayName: task.title,
          preview: task.description,
        });
      }
    });

    return suggestions.slice(0, 20); // Limit to 20 results
  };

  const getFilteredSuggestions = (): MentionSuggestion[] => {
    const allSuggestions = getAllSuggestions();
    
    if (activeTab === 'all') {
      return allSuggestions;
    }
    
    return allSuggestions.filter(suggestion => {
      if (activeTab === 'users') return suggestion.type === 'user';
      if (activeTab === 'channels') return suggestion.type === 'channel';
      if (activeTab === 'messages') return suggestion.type === 'message';
      if (activeTab === 'tasks') return suggestion.type === 'task';
      return true;
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'user': return 'person';
      case 'channel': return 'tag';
      case 'message': return 'chat-bubble';
      case 'task': return 'assignment';
      default: return 'search';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'user': return '#3B82F6';
      case 'channel': return '#10B981';
      case 'message': return '#8B5CF6';
      case 'task': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  if (!visible) return null;

  const suggestions = getFilteredSuggestions();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 120,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        maxHeight: 300,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
        <Text className="text-lg font-semibold text-gray-800">
          Mention Someone or Something
        </Text>
        <TouchableOpacity onPress={onClose} className="p-1">
          <MaterialIcon name="close" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-2 py-2 border-b border-gray-100"
      >
        {[
          { key: 'all', label: 'All' },
          { key: 'users', label: 'People' },
          { key: 'channels', label: 'Channels' },
          { key: 'messages', label: 'Messages' },
          { key: 'tasks', label: 'Tasks' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1 mx-1 rounded-full ${
              activeTab === tab.key ? 'bg-blue-100' : 'bg-gray-50'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab.key ? 'text-blue-600' : 'text-gray-600'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Suggestions */}
      <ScrollView style={{ maxHeight: 200 }} className="p-2">
        {suggestions.length === 0 ? (
          <View className="py-8 items-center">
            <MaterialIcon name="search-off" size={32} color="#9CA3AF" />
            <Text className="text-gray-500 mt-2">No results found</Text>
          </View>
        ) : (
          suggestions.map(suggestion => (
            <TouchableOpacity
              key={`${suggestion.type}-${suggestion.id}`}
              onPress={() => onMentionSelect(suggestion)}
              className="flex-row items-center p-3 rounded-lg hover:bg-gray-50"
            >
              {/* Icon/Avatar */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: getTypeColor(suggestion.type),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                {suggestion.type === 'user' && suggestion.avatar ? (
                  <Avatar
                    user={{
                      id: suggestion.id,
                      name: suggestion.name,
                      avatar: suggestion.avatar,
                      role: suggestion.role,
                    }}
                    size="sm"
                  />
                ) : (
                  <MaterialIcon 
                    name={getIcon(suggestion.type)} 
                    size={18} 
                    color="white" 
                  />
                )}
              </View>

              {/* Content */}
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="font-medium text-gray-900">
                    {suggestion.displayName}
                  </Text>
                  <View
                    style={{
                      backgroundColor: getTypeColor(suggestion.type),
                      borderRadius: 8,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      marginLeft: 8,
                    }}
                  >
                    <Text className="text-white text-xs font-medium capitalize">
                      {suggestion.type}
                    </Text>
                  </View>
                </View>
                
                {suggestion.preview && (
                  <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
                    {suggestion.preview}
                  </Text>
                )}
                
                {suggestion.channel && (
                  <Text className="text-gray-400 text-xs mt-1">
                    in #{suggestion.channel}
                  </Text>
                )}
              </View>

              {/* Arrow */}
              <MaterialIcon name="arrow-forward-ios" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};