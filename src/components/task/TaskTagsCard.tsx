import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface TaskTagsCardProps {
  tags: string[];
}

const getTagColor = (tag: string) => {
  const colors = [
    { bg: '#EFF6FF', text: '#1D4ED8', border: '#DBEAFE' },
    { bg: '#F0FDF4', text: '#166534', border: '#DCFCE7' },
    { bg: '#FEF7E0', text: '#B45309', border: '#FDE68A' },
    { bg: '#FDF2F8', text: '#BE185D', border: '#FCE7F3' },
    { bg: '#F5F3FF', text: '#7C2D12', border: '#EDE9FE' },
  ];
  
  const hash = tag.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

export const TaskTagsCard: React.FC<TaskTagsCardProps> = ({ tags }) => {
  if (!tags || tags.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInUp.delay(700).duration(600)}
      className="bg-white mx-6 mt-4 mb-6 rounded-2xl p-6"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center mb-4">
        <MaterialIcon name="local-offer" size={20} color="#374151" />
        <Text className="text-lg font-bold text-gray-900 ml-2">Tags</Text>
        <View className="ml-2 bg-gray-100 px-2 py-1 rounded-full">
          <Text className="text-xs text-gray-600 font-medium">{tags.length}</Text>
        </View>
      </View>
      
      <View className="flex-row flex-wrap gap-3">
        {tags.map((tag, index) => {
          const tagStyle = getTagColor(tag);
          return (
            <View
              key={index}
              className="px-3 py-2 rounded-full flex-row items-center"
              style={{
                backgroundColor: tagStyle.bg,
                borderWidth: 1,
                borderColor: tagStyle.border,
              }}
            >
              <MaterialIcon 
                name="tag" 
                size={12} 
                color={tagStyle.text} 
                style={{ marginRight: 4 }}
              />
              <Text 
                className="text-sm font-medium"
                style={{ color: tagStyle.text }}
              >
                {tag}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
};