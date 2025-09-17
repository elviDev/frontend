import React from 'react';
import { ScrollView, Text } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { TaskStats } from '../../types/task.types';

interface TaskStatsCardsProps {
  taskStats: TaskStats;
}

export const TaskStatsCards: React.FC<TaskStatsCardsProps> = ({
  taskStats,
}) => {
  const statsData = [
    { label: 'Total', value: taskStats.totalTasks || taskStats.total || 0, color: '#6B7280' },
    { label: 'Pending', value: taskStats.tasksByStatus?.pending || taskStats.pending || 0, color: '#F59E0B' },
    { label: 'In Progress', value: taskStats.tasksByStatus?.in_progress || taskStats.inProgress || 0, color: '#3B82F6' },
    { label: 'Review', value: taskStats.tasksByStatus?.review || 0, color: '#8B5CF6' },
    { label: 'Completed', value: taskStats.tasksByStatus?.completed || taskStats.completed || 0, color: '#22C55E' },
    { label: 'Overdue', value: taskStats.overdueTasks || taskStats.overdue || 0, color: '#EF4444' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-4"
    >
      {statsData.map((stat, index) => (
        <Animated.View
          key={stat.label}
          entering={FadeInRight.delay(index * 100).duration(600)}
          className="bg-white rounded-xl p-4 mr-3 min-w-[80px] items-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          <Text
            className="text-2xl font-bold mb-1"
            style={{ color: stat.color }}
          >
            {stat.value}
          </Text>
          <Text className="text-gray-600 text-xs text-center">
            {stat.label}
          </Text>
        </Animated.View>
      ))}
    </ScrollView>
  );
};
