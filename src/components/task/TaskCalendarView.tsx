import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Feather from 'react-native-vector-icons/Feather';
import { Task } from '../../types/task.types';
import { TaskCalendar } from './TaskCalendar';
import { TaskUtils } from './TaskUtils';

interface TaskCalendarViewProps {
  filteredTasks: Task[];
  searchQuery: string;
  onTaskPress: (task: Task) => void;
  onDatePress: (date: Date) => void;
}

export const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({
  filteredTasks,
  searchQuery,
  onTaskPress,
  onDatePress,
}) => {
  // Group tasks by due date
  const tasksByDate = filteredTasks.reduce((acc, task) => {
    // Handle both due_date and dueDate fields, and ensure it's a valid date
    const dueDate = task.due_date || task.dueDate;
    if (!dueDate) return acc; // Skip tasks without due dates
    
    const dateObj = new Date(dueDate);
    if (isNaN(dateObj.getTime())) return acc; // Skip invalid dates
    
    const dateKey = dateObj.toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const sortedEntries = Object.entries(tasksByDate)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());

  const renderEmptyState = () => (
    <Animated.View
      entering={FadeInUp.delay(400).duration(600)}
      className="bg-white rounded-2xl p-8 mb-4 items-center"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
        <Feather name="calendar" size={24} color="#9CA3AF" />
      </View>
      <Text className="text-gray-500 text-lg font-medium mb-2">
        No scheduled tasks
      </Text>
      <Text className="text-gray-400 text-sm text-center">
        {searchQuery.trim()
          ? 'No tasks match your search criteria'
          : 'Create tasks with due dates to see them on the calendar'}
      </Text>
    </Animated.View>
  );

  const renderTasksByDate = () => {
    return sortedEntries.map(([dateString, dateTasks], groupIndex) => {
      const date = new Date(dateString);
      const isToday = date.toDateString() === new Date().toDateString();
      const isPast = date < new Date() && !isToday;
      const isUpcoming = date > new Date();

      return (
        <Animated.View
          key={dateString}
          entering={FadeInUp.delay((groupIndex + 1) * 100).duration(600)}
          className="bg-white rounded-2xl p-5 mb-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            borderLeftWidth: 4,
            borderLeftColor: isToday 
              ? '#3B82F6' 
              : isPast 
                ? '#EF4444' 
                : '#22C55E',
          }}
        >
          {/* Enhanced Date Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View 
                className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                  isToday 
                    ? 'bg-blue-100' 
                    : isPast 
                      ? 'bg-red-100' 
                      : 'bg-green-100'
                }`}
              >
                <Text 
                  className={`text-xl font-bold ${
                    isToday 
                      ? 'text-blue-600' 
                      : isPast 
                        ? 'text-red-600' 
                        : 'text-green-600'
                  }`}
                >
                  {date.getDate()}
                </Text>
              </View>
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  {date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <View className="flex-row items-center">
                  <Text 
                    className={`text-sm font-medium ${
                      isToday 
                        ? 'text-blue-600' 
                        : isPast 
                          ? 'text-red-600' 
                          : 'text-green-600'
                    }`}
                  >
                    {isToday ? 'Today' : isPast ? 'Past Due' : 'Upcoming'}
                  </Text>
                  <Text className="text-gray-400 text-sm ml-2">
                    • {date.getFullYear()}
                  </Text>
                </View>
              </View>
            </View>
            <View 
              className={`px-3 py-1 rounded-full ${
                isToday 
                  ? 'bg-blue-50' 
                  : isPast 
                    ? 'bg-red-50' 
                    : 'bg-green-50'
              }`}
            >
              <Text 
                className={`text-sm font-semibold ${
                  isToday 
                    ? 'text-blue-700' 
                    : isPast 
                      ? 'text-red-700' 
                      : 'text-green-700'
                }`}
              >
                {dateTasks.length} task{dateTasks.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Enhanced Task List */}
          <View className="space-y-3">
            {dateTasks.map((task, taskIndex) => (
              <TouchableOpacity
                key={task.id}
                onPress={() => {
                  try {
                    onTaskPress(task);
                  } catch (error) {
                    console.warn('TaskCalendarView: Error handling task press:', error);
                  }
                }}
                className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <View
                  className="w-4 h-4 rounded-full mr-4"
                  style={{
                    backgroundColor: TaskUtils.getPriorityColor(task.priority),
                  }}
                />
                <View className="flex-1">
                  <Text
                    className="text-gray-900 font-semibold text-base"
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Feather 
                      name={TaskUtils.getCategoryIcon(task.category)} 
                      size={12} 
                      color="#6B7280" 
                    />
                    <Text className="text-gray-500 text-sm ml-1">
                      {task.category} • {task.channelName}
                    </Text>
                    {task.progress > 0 && (
                      <>
                        <Text className="text-gray-400 text-sm ml-2">•</Text>
                        <Text className="text-gray-600 text-sm ml-2 font-medium">
                          {task.progress}% complete
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <View className="items-end">
                  <View
                    className="px-3 py-1 rounded-full mb-1"
                    style={{
                      backgroundColor: `${TaskUtils.getStatusColor(task.status)}20`,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: TaskUtils.getStatusColor(task.status) }}
                    >
                      {task.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                  {(() => {
                    const assignees = task.assignees || (task.assigned_to ? task.assigned_to.map(id => ({ id, name: 'User', avatar: id.slice(0, 2).toUpperCase() })) : []);
                    return assignees.length > 0 && (
                    <View className="flex-row -space-x-1">
                      {assignees.slice(0, 2).map((assignee, index) => (
                        <View
                          key={assignee.id}
                          className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white items-center justify-center"
                          style={{ zIndex: 10 - index }}
                        >
                          <Text className="text-white text-xs font-bold">
                            {assignee.avatar}
                          </Text>
                        </View>
                      ))}
                      {assignees.length > 2 && (
                        <View className="w-6 h-6 bg-gray-400 rounded-full border-2 border-white items-center justify-center">
                          <Text className="text-white text-xs font-bold">
                            +{assignees.length - 2}
                          </Text>
                        </View>
                      )}
                    </View>
                    );
                  })()}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      );
    });
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
    >
      {/* Professional Calendar */}
      <Animated.View entering={FadeInUp.delay(200).duration(600)}>
        <TaskCalendar
          tasks={filteredTasks}
          onTaskPress={onTaskPress}
          onDatePress={(date) => {
            try {
              onDatePress(date);
            } catch (error) {
              console.warn('TaskCalendarView: Error handling date press:', error);
            }
          }}
        />
      </Animated.View>

      {/* Tasks grouped by due date */}
      {sortedEntries.length === 0 ? renderEmptyState() : renderTasksByDate()}
    </ScrollView>
  );
};