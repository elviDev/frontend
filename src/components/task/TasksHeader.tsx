import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import Feather from 'react-native-vector-icons/Feather';

interface TasksHeaderProps {
  viewMode: 'list' | 'board' | 'calendar';
  onViewModeChange: (mode: 'list' | 'board' | 'calendar') => void;
  onCreateTask: () => void;
  headerScale: SharedValue<number>;
}

export const TasksHeader: React.FC<TasksHeaderProps> = ({
  viewMode,
  onViewModeChange,
  onCreateTask,
  headerScale,
}) => {
  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const handleViewModeChange = (mode: 'list' | 'board' | 'calendar') => {
    console.log('TasksHeader: Changing view mode to:', mode);
    onViewModeChange(mode);
  };

  const handleCreateTaskPress = () => {
    console.log('TasksHeader: Create task button pressed');
    onCreateTask();
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(800).springify()}
      style={[animatedHeaderStyle, { paddingHorizontal: 16, marginBottom: 16 }]}
    >
      {/* Title and Actions */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#111827' }}>Tasks</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {/* View Mode Switcher */}
          <View style={{ flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 8, padding: 4 }}>
            {(['list', 'board', 'calendar'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                onPress={() => {
                  console.log(`Pressed ${mode} button`);
                  handleViewModeChange(mode);
                }}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: viewMode === mode ? '#ffffff' : 'transparent',
                  shadowColor: viewMode === mode ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: viewMode === mode ? 0.1 : 0,
                  shadowRadius: 1,
                  elevation: viewMode === mode ? 1 : 0,
                }}
              >
                <Feather
                  name={
                    mode === 'list'
                      ? 'list'
                      : mode === 'board'
                        ? 'columns'
                        : 'calendar'
                  }
                  size={16}
                  color={viewMode === mode ? '#3933C6' : '#6B7280'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Add Task Button */}
          <TouchableOpacity
            onPress={() => {
              console.log('Pressed create task button');
              handleCreateTaskPress();
            }}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#3b82f6',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Feather name="plus" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};
