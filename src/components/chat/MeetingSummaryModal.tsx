// src/components/chat/MeetingSummaryModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ChannelSummary } from '../../types/chat';

const { width, height } = Dimensions.get('window');

interface MeetingSummaryModalProps {
  visible: boolean;
  summary: ChannelSummary | null;
  onClose: () => void;
  onShare: () => void;
  onCreateTasks: () => void;
}

export const MeetingSummaryModal: React.FC<MeetingSummaryModalProps> = ({
  visible,
  summary,
  onClose,
  onShare,
  onCreateTasks,
}) => {
  const slideY = useSharedValue(height);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      slideY.value = withSpring(0, { damping: 15 });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      slideY.value = withSpring(height, { damping: 15 });
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!summary) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#000',
            },
            backdropAnimatedStyle,
          ]}
        />

        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1"
        />

        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: height * 0.85,
            },
            animatedModalStyle,
          ]}
          className="bg-white rounded-t-3xl"
        >
          {/* Handle */}
          <View className="items-center py-3">
            <View className="w-12 h-1 bg-gray-300 rounded-full" />
          </View>

          {/* Header */}
          <View className="px-6 pb-4 border-b border-gray-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900 mb-1">
                  📝 Meeting Summary
                </Text>
                <Text className="text-gray-500 text-sm">
                  Generated {summary.generatedAt.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
              >
                <Text className="text-gray-600 text-lg">×</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
          >
            {/* Session Info */}
            <View className="py-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                {summary.title}
              </Text>
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-gray-500 text-sm">Duration</Text>
                  <Text className="text-gray-900 font-medium">
                    {summary.duration}
                  </Text>
                </View>
                <View>
                  <Text className="text-gray-500 text-sm">Participants</Text>
                  <Text className="text-gray-900 font-medium">
                    {summary.participants.length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Key Points */}
            <View className="py-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                🎯 Key Discussion Points
              </Text>
              {summary.keyPoints.map((point, index) => (
                <View key={index} className="flex-row mb-2">
                  <View className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3" />
                  <Text className="text-gray-700 flex-1 leading-6">
                    {point}
                  </Text>
                </View>
              ))}
            </View>

            {/* Decisions */}
            <View className="py-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                ✅ Decisions Made
              </Text>
              {summary.decisions.map((decision, index) => (
                <View key={index} className="flex-row mb-2">
                  <Text className="text-green-500 mr-3">✓</Text>
                  <Text className="text-gray-700 flex-1 leading-6">
                    {decision}
                  </Text>
                </View>
              ))}
            </View>

            {/* Action Items */}
            <View className="py-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                📋 Action Items
              </Text>
              {summary.actionItems.map((item, index) => (
                <View key={index} className="bg-gray-50 rounded-lg p-3 mb-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text
                      className="text-gray-900 font-medium flex-1"
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded-full ${
                        item.priority === 'high'
                          ? 'bg-red-100'
                          : item.priority === 'medium'
                            ? 'bg-yellow-100'
                            : 'bg-green-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          item.priority === 'high'
                            ? 'text-red-600'
                            : item.priority === 'medium'
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        }`}
                      >
                        {item.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-500 text-sm">
                      Assignee: User {item.assigneeId}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      Due: {item.dueDate.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View className="h-4" />
          </ScrollView>

          {/* Action Buttons */}
          <View className="px-6 py-4 border-t border-gray-100">
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={onShare}
                className="flex-1 bg-blue-500 rounded-full py-3"
                style={{
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Text className="text-white text-center font-semibold">
                  📤 Share Summary
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onCreateTasks}
                className="flex-1 bg-purple-500 rounded-full py-3"
                style={{
                  shadowColor: '#8B5CF6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Text className="text-white text-center font-semibold">
                  ✅ Create Tasks
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
