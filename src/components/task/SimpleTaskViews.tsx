import React from 'react';
import { View, Text, FlatList, ScrollView } from 'react-native';
import { Task } from '../../types/task.types';
import { TaskCard } from './TaskCard';

interface SimpleTaskViewsProps {
  tasks: Task[];
  viewMode: 'list' | 'board' | 'calendar';
  onTaskPress: (task: Task) => void;
}

export const SimpleTaskViews: React.FC<SimpleTaskViewsProps> = ({
  tasks,
  viewMode,
  onTaskPress,
}) => {
  const renderListView = () => (
    <FlatList
      data={tasks}
      renderItem={({ item, index }) => (
        <TaskCard
          task={item}
          index={index}
          onPress={onTaskPress}
          onLongPress={() => {}}
          viewMode="list"
        />
      )}
      keyExtractor={item => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    />
  );

  const renderBoardView = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
    >
      <View className="w-80 mr-4">
        <View className="bg-white rounded-2xl p-4">
          <Text className="text-lg font-bold mb-4">Simple Board View</Text>
          {tasks.slice(0, 3).map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onPress={onTaskPress}
              onLongPress={() => {}}
              viewMode="board"
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderCalendarView = () => (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View className="bg-white rounded-2xl p-4">
        <Text className="text-lg font-bold mb-4">Simple Calendar View</Text>
        <Text className="text-gray-600 mb-4">
          Showing {tasks.length} tasks
        </Text>
        {tasks.slice(0, 5).map((task, index) => (
          <View key={task.id} className="mb-2 p-2 bg-gray-50 rounded">
            <Text className="font-semibold">{task.title}</Text>
            <Text className="text-sm text-gray-600">
              Due: {task.dueDate.toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  switch (viewMode) {
    case 'list':
      return renderListView();
    case 'board':
      return renderBoardView();
    case 'calendar':
      return renderCalendarView();
    default:
      return (
        <View className="flex-1 items-center justify-center">
          <Text>Unknown view mode: {viewMode}</Text>
        </View>
      );
  }
};