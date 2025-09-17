import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface ChannelHeaderProps {
  channelName: string;
  members: any[];
  messageCount?: number;
  fileCount?: number;
  onBack: () => void;
  onMembersPress: () => void;
  onStatsPress?: () => void;
}

export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  channelName,
  members,
  messageCount,
  fileCount,
  onBack,
  onMembersPress,
  onStatsPress,
}) => {
  const backButtonScale = useSharedValue(1);

  const backButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backButtonScale.value }],
  }));

  const handleBackPress = () => {
    backButtonScale.value = withSpring(0.95, { damping: 10 }, () => {
      backButtonScale.value = withSpring(1, { damping: 10 });
    });
    onBack();
  };

  const getAvatarColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500'];
    return colors[index % colors.length];
  };

  return (
    <View className="bg-white px-6 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Animated.View style={backButtonAnimatedStyle}>
            <TouchableOpacity
              onPress={handleBackPress}
              className="w-9 h-9 bg-gray-50 rounded-full items-center justify-center mr-4"
            >
              <Feather name="arrow-left" size={18} color="#374151" />
            </TouchableOpacity>
          </Animated.View>

          <View className="flex-1">
            <Text className="text-gray-900 text-xl font-bold" numberOfLines={1}>
              # {channelName}
            </Text>
            <TouchableOpacity onPress={onMembersPress}>
              <Text className="text-gray-500 text-sm font-medium mt-0.5">
                {members.length} {members.length === 1 ? 'member' : 'members'} discussing
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modern Member Avatars */}
        <View className="flex-row items-center">
          <View className="flex-row -space-x-1.5 mr-3">
            {members.slice(0, 3).map((member, index) => (
              <View
                key={member.id || index}
                className={`w-8 h-8 ${getAvatarColor(index)} rounded-full border-2 border-white items-center justify-center shadow-sm`}
                style={{ zIndex: members.length - index }}
              >
                <Text className="text-white text-xs font-semibold">
                  {(member.avatar && member.avatar.length === 1) 
                    ? member.avatar 
                    : (member.name || 'U').charAt(0).toUpperCase()}
                </Text>
                {/* Online indicator */}
                <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
              </View>
            ))}
            {members.length > 3 && (
              <View className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white items-center justify-center shadow-sm">
                <Text className="text-gray-600 text-xs font-semibold">
                  +{members.length - 3}
                </Text>
              </View>
            )}
          </View>
          
          {/* Channel Info Button */}
          <TouchableOpacity 
            onPress={onStatsPress}
            className="w-8 h-8 bg-gray-50 rounded-full items-center justify-center"
          >
            <Feather name="info" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
