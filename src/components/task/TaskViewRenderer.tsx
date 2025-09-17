import React, { useState } from 'react';
import { View, FlatList, Text, RefreshControl, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Feather from 'react-native-vector-icons/Feather';
import { Task } from '../../types/task.types';
import { TaskCard } from './TaskCard';
import { TaskBoardView } from './TaskBoardView';
import { TaskCalendarView } from './TaskCalendarView';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface TaskViewRendererProps {
  tasks: Task[];
  viewMode: 'list' | 'board' | 'calendar';
  searchQuery: string;
  onTaskPress: (task: Task) => void;
  onTaskLongPress: (task: Task) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const TaskViewRenderer: React.FC<TaskViewRendererProps> = ({
  tasks,
  viewMode,
  searchQuery,
  onTaskPress,
  onTaskLongPress,
  refreshing = false,
  onRefresh,
}) => {
  const [useSimpleViews, setUseSimpleViews] = useState(false);

  const renderTaskCard = ({
    item: task,
    index,
  }: {
    item: Task;
    index: number;
  }) => (
    <TaskCard
      task={task}
      index={index}
      onPress={onTaskPress}
      onLongPress={onTaskLongPress}
      viewMode="list"
    />
  );

  const renderEmptyState = () => (
    <Animated.View
      entering={FadeInUp.delay(400).duration(600)}
      className="flex-1 items-center justify-center py-12"
    >
      <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
        <Feather name="clipboard" size={32} color="#9CA3AF" />
      </View>
      <Text className="text-gray-500 text-lg font-medium mb-2">
        No tasks found
      </Text>
      <Text className="text-gray-400 text-sm text-center px-8">
        {searchQuery.trim()
          ? 'Try adjusting your search or filters'
          : 'Create your first task to get started'}
      </Text>
    </Animated.View>
  );

  const renderSimpleView = () => {
    switch (viewMode) {
      case 'list':
        return (
          <FlatList
            data={tasks}
            renderItem={renderTaskCard}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={renderEmptyState()}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              ) : undefined
            }
          />
        );
      case 'board':
        return (
          <View className="flex-1 p-4">
            <Text className="text-lg font-bold mb-4">Board View (Simple)</Text>
            {tasks.slice(0, 5).map((task, index) => (
              <TaskCard
                key={`board-${task.id}-${index}`}
                task={task}
                index={index}
                onPress={(task) => {
                  try {
                    onTaskPress(task);
                  } catch (error) {
                    console.warn('TaskViewRenderer: Error in simple board view task press:', error);
                  }
                }}
                onLongPress={(task) => {
                  try {
                    onTaskLongPress(task);
                  } catch (error) {
                    console.warn('TaskViewRenderer: Error in simple board view task long press:', error);
                  }
                }}
                viewMode="board"
              />
            ))}
          </View>
        );
      case 'calendar':
        return (
          <View className="flex-1 p-4">
            <Text className="text-lg font-bold mb-4">
              Calendar View (Simple)
            </Text>
            {tasks.slice(0, 5).map((task, index) => (
              <View key={`calendar-${task.id}-${index}`} className="mb-2 p-3 bg-white rounded-lg">
                <Text className="font-semibold">{task.title}</Text>
                <Text className="text-sm text-gray-600">
                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                </Text>
              </View>
            ))}
          </View>
        );
      default:
        return renderEmptyState();
    }
  };

  const renderComplexView = () => {
    switch (viewMode) {
      case 'list':
        return (
          <FlatList
            data={tasks}
            renderItem={renderTaskCard}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={renderEmptyState()}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              ) : undefined
            }
          />
        );
      case 'board':
        return (
          <TaskBoardView 
            filteredTasks={tasks}
            onTaskPress={(task) => {
              try {
                onTaskPress(task);
              } catch (error) {
                console.warn('TaskViewRenderer: Error in board view task press:', error);
              }
            }} 
          />
        );
      case 'calendar':
        return (
          <TaskCalendarView
            filteredTasks={tasks}
            searchQuery={searchQuery}
            onTaskPress={(task) => {
              try {
                onTaskPress(task);
              } catch (error) {
                console.warn('TaskViewRenderer: Error in calendar view task press:', error);
              }
            }}
            onDatePress={date => {
              try {
                console.log('Selected date:', date);
              } catch (error) {
                console.warn('TaskViewRenderer: Error in calendar view date press:', error);
              }
            }}
          />
        );
      default:
        return renderEmptyState();
    }
  };

  return (
    <View className="flex-1">
      {/* Render Views */}
      <ErrorBoundary
        fallback={
          <View className="flex-1 items-center justify-center p-4">
            <Text className="text-red-500 text-lg font-bold mb-2">
              {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View Error
            </Text>
            <Text className="text-gray-600 text-center mb-4">
              The advanced {viewMode} view encountered an error.
            </Text>
            <TouchableOpacity
              onPress={() => setUseSimpleViews(true)}
              className="bg-blue-500 px-4 py-2 rounded mb-2"
            >
              <Text className="text-white">Switch to Simple View</Text>
            </TouchableOpacity>
          </View>
        }
      >
        {useSimpleViews ? renderSimpleView() : renderComplexView()}
      </ErrorBoundary>
    </View>
  );
};
