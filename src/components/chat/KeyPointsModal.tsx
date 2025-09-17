import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Message, TaskAssignment } from '../../types/chat';

const { width, height } = Dimensions.get('window');

interface KeyPointsModalProps {
  visible: boolean;
  messages: Message[];
  onClose: () => void;
  onCreateTask: (task: Partial<TaskAssignment>) => void;
}

export const KeyPointsModal: React.FC<KeyPointsModalProps> = ({
  visible,
  messages,
  onClose,
  onCreateTask,
}) => {
  const [selectedKeyPoint, setSelectedKeyPoint] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>(
    'medium',
  );

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

  // Extract key points from messages using AI-like logic
  const extractKeyPoints = () => {
    const keyPoints = [];

    // Simple extraction based on message content
    const importantMessages = messages.filter(
      msg =>
        msg.type === 'text' &&
        (msg.content.includes('need to') ||
          msg.content.includes('should') ||
          msg.content.includes('must') ||
          msg.content.includes('decide') ||
          msg.content.includes('plan')),
    );

    importantMessages.forEach(msg => {
      // Extract sentences that could be action items
      const sentences = msg.content.split('.').filter(s => s.length > 20);
      sentences.forEach(sentence => {
        if (sentence.includes('need to') || sentence.includes('should')) {
          keyPoints.push({
            id: `kp_${msg.id}_${sentences.indexOf(sentence)}`,
            content: sentence.trim(),
            sender: msg.sender.name,
            timestamp: msg.timestamp,
            canBeTask: true,
          });
        }
      });
    });

    // Add some mock key points for demonstration
    keyPoints.push(
      {
        id: 'kp_1',
        content: 'Finalize the technology stack for the e-commerce platform',
        sender: 'Sarah (PM)',
        timestamp: new Date(),
        canBeTask: true,
      },
      {
        id: 'kp_2',
        content: 'Create initial wireframes and design mockups',
        sender: 'Lisa (Lead Designer)',
        timestamp: new Date(),
        canBeTask: true,
      },
      {
        id: 'kp_3',
        content: 'Set up development environment and repository structure',
        sender: 'Mike (Engineering Lead)',
        timestamp: new Date(),
        canBeTask: true,
      },
      {
        id: 'kp_4',
        content: 'Research best practices for mobile e-commerce UX',
        sender: 'Lisa (Lead Designer)',
        timestamp: new Date(),
        canBeTask: true,
      },
      {
        id: 'kp_5',
        content: 'Define database schema and API endpoints',
        sender: 'Mike (Engineering Lead)',
        timestamp: new Date(),
        canBeTask: true,
      },
      {
        id: 'kp_6',
        content: 'Conduct user research and create personas',
        sender: 'Lisa (Lead Designer)',
        timestamp: new Date(),
        canBeTask: false, // Not actionable
      },
    );

    return keyPoints;
  };

  const keyPoints = extractKeyPoints();

  const handleCreateTask = () => {
    if (taskTitle.trim() && selectedKeyPoint) {
      onCreateTask({
        title: taskTitle,
        priority: taskPriority,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      });
      setTaskTitle('');
      setSelectedKeyPoint(null);
      onClose();
    }
  };

  const selectKeyPoint = (keyPoint: any) => {
    setSelectedKeyPoint(keyPoint.id);
    setTaskTitle(keyPoint.content);
  };

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
                  💡 Key Points & Tasks
                </Text>
                <Text className="text-gray-500 text-sm">
                  Convert discussion points into actionable tasks
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
            {/* Key Points List */}
            <View className="py-4">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                🎯 Identified Key Points
              </Text>

              {keyPoints.map(keyPoint => (
                <TouchableOpacity
                  key={keyPoint.id}
                  onPress={() => keyPoint.canBeTask && selectKeyPoint(keyPoint)}
                  disabled={!keyPoint.canBeTask}
                  className={`mb-3 p-4 rounded-lg border-2 ${
                    selectedKeyPoint === keyPoint.id
                      ? 'border-blue-500 bg-blue-50'
                      : keyPoint.canBeTask
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-100 bg-gray-50'
                  }`}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: keyPoint.canBeTask ? 0.05 : 0.02,
                    shadowRadius: 4,
                    elevation: 0,
                  }}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-3">
                      <Text
                        className={`font-medium leading-6 mb-2 ${
                          keyPoint.canBeTask ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {keyPoint.content}
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="text-gray-500 text-sm">
                          by {keyPoint.sender}
                        </Text>
                        <View className="w-1 h-1 bg-gray-400 rounded-full mx-2" />
                        <Text className="text-gray-500 text-sm">
                          {keyPoint.timestamp.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>

                    <View
                      className={`px-2 py-1 rounded-full ${
                        keyPoint.canBeTask ? 'bg-green-100' : 'bg-gray-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          keyPoint.canBeTask
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {keyPoint.canBeTask ? 'Can be task' : 'Info only'}
                      </Text>
                    </View>
                  </View>

                  {selectedKeyPoint === keyPoint.id && (
                    <View className="mt-3 pt-3 border-t border-blue-200">
                      <Text className="text-blue-600 text-sm font-medium">
                        ✓ Selected for task creation
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Task Creation Form */}
            {selectedKeyPoint && (
              <View className="py-4 border-t border-gray-100">
                <Text className="text-lg font-semibold text-gray-900 mb-4">
                  ✅ Create Task
                </Text>

                {/* Task Title */}
                <View className="mb-4">
                  <Text className="text-gray-700 font-medium mb-2">
                    Task Title
                  </Text>
                  <TextInput
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    placeholder="Enter task title..."
                    className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900"
                    multiline
                    style={{
                      minHeight: 60,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>

                {/* Priority Selection */}
                <View className="mb-4">
                  <Text className="text-gray-700 font-medium mb-2">
                    Priority
                  </Text>
                  <View className="flex-row space-x-2">
                    {(['low', 'medium', 'high'] as const).map(priority => (
                      <TouchableOpacity
                        key={priority}
                        onPress={() => setTaskPriority(priority)}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                          taskPriority === priority
                            ? priority === 'high'
                              ? 'border-red-500 bg-red-50'
                              : priority === 'medium'
                                ? 'border-yellow-500 bg-yellow-50'
                                : 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white'
                        }`}
                        style={{
                          shadowColor:
                            taskPriority === priority
                              ? priority === 'high'
                                ? '#EF4444'
                                : priority === 'medium'
                                  ? '#F59E0B'
                                  : '#10B981'
                              : 'transparent',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: taskPriority === priority ? 0.1 : 0,
                          shadowRadius: 4,
                          elevation: taskPriority === priority ? 2 : 0,
                        }}
                      >
                        <Text
                          className={`text-center font-medium ${
                            taskPriority === priority
                              ? priority === 'high'
                                ? 'text-red-600'
                                : priority === 'medium'
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Due Date Preview */}
                <View className="mb-4 bg-blue-50 rounded-lg p-3">
                  <Text className="text-blue-600 text-sm font-medium mb-1">
                    📅 Due Date
                  </Text>
                  <Text className="text-blue-800">
                    {new Date(
                      Date.now() + 7 * 24 * 60 * 60 * 1000,
                    ).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text className="text-blue-600 text-xs mt-1">
                    (Default: 1 week from now)
                  </Text>
                </View>
              </View>
            )}

            <View className="h-4" />
          </ScrollView>

          {/* Action Buttons */}
          <View className="px-6 py-4 border-t border-gray-100">
            {selectedKeyPoint ? (
              <View className="space-y-3">
                <TouchableOpacity
                  onPress={handleCreateTask}
                  disabled={!taskTitle.trim()}
                  className={`w-full rounded-full py-4 ${
                    taskTitle.trim() ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                  style={
                    taskTitle.trim()
                      ? {
                          shadowColor: '#8B5CF6',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 6,
                        }
                      : {}
                  }
                >
                  <Text
                    className={`text-center font-semibold text-lg ${
                      taskTitle.trim() ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    ✅ Create Task
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setSelectedKeyPoint(null);
                    setTaskTitle('');
                  }}
                  className="w-full border-2 border-gray-200 rounded-full py-3"
                >
                  <Text className="text-center font-medium text-gray-600">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="bg-gray-100 rounded-lg p-4">
                <Text className="text-gray-500 text-center">
                  💡 Select a key point above to create a task
                </Text>
                <Text className="text-gray-400 text-center text-sm mt-1">
                  Only actionable items can be converted to tasks
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
