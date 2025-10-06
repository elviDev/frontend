import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Task } from '../../types/task.types';
import { TaskUtils } from './TaskUtils';

interface TaskProgressCardProps {
  task: Task;
  formatDueDate: (date: Date) => string;
  onProgressPress?: () => void;
}

export const TaskProgressCard: React.FC<TaskProgressCardProps> = ({
  task,
  formatDueDate,
  onProgressPress,
}) => {
  const progressPercentage = task.progress_percentage || 0;
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#10B981';
    if (progress >= 60) return '#3B82F6';  
    if (progress >= 40) return '#F59E0B';
    if (progress >= 20) return '#EF4444';
    return '#6B7280';
  };

  const getProgressIcon = (progress: number) => {
    if (progress === 100) return 'check-circle';
    if (progress >= 75) return 'trending-up';
    if (progress >= 50) return 'schedule';
    if (progress >= 25) return 'hourglass-empty';
    return 'play-circle-outline';
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(300).duration(600)}
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      {/* Header with Progress */}
      <TouchableOpacity
        onPress={onProgressPress}
        activeOpacity={onProgressPress ? 0.7 : 1}
        style={{ marginBottom: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcon 
              name={getProgressIcon(progressPercentage)} 
              size={20} 
              color={getProgressColor(progressPercentage)}
              style={{ marginRight: 8 }}
            />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Progress</Text>
            {onProgressPress && (
              <MaterialIcon 
                name="edit" 
                size={16} 
                color="#6B7280"
                style={{ marginLeft: 8 }}
              />
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text 
              style={{ 
                fontSize: 24, 
                fontWeight: 'bold',
                color: getProgressColor(progressPercentage)
              }}
            >
              {progressPercentage}%
            </Text>
            {progressPercentage === 100 && (
              <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '500' }}>Complete!</Text>
            )}
          </View>
        </View>

        {/* Progress Bar */}
        <View style={{ backgroundColor: '#E5E7EB', height: 12, borderRadius: 6, overflow: 'hidden' }}>
          <Animated.View
            entering={ZoomIn.delay(500).duration(800)}
            style={{
              height: '100%',
              borderRadius: 6,
              width: `${progressPercentage}%`,
              backgroundColor: getProgressColor(progressPercentage),
            }}
          />
        </View>

        {onProgressPress && (
          <Text style={{
            fontSize: 12,
            color: '#6B7280',
            textAlign: 'center',
            marginTop: 8,
            fontStyle: 'italic',
          }}>
            Tap to update progress
          </Text>
        )}
      </TouchableOpacity>

      {/* Progress Details */}
      <View style={{ gap: 12 }}>
        {/* Subtasks Progress */}
        {totalSubtasks > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcon name="task-alt" size={16} color="#6B7280" />
              <Text style={{ color: '#6B7280', fontSize: 14, marginLeft: 8 }}>Subtasks</Text>
            </View>
            <Text style={{ color: '#111827', fontWeight: '600', fontSize: 14 }}>
              {completedSubtasks} of {totalSubtasks}
            </Text>
          </View>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcon name="schedule" size={16} color="#6B7280" />
              <Text style={{ color: '#6B7280', fontSize: 14, marginLeft: 8 }}>Due Date</Text>
            </View>
            <Text style={{ color: '#111827', fontWeight: '600', fontSize: 14 }}>
              {formatDueDate(task.dueDate)}
            </Text>
          </View>
        )}

        {/* Time Tracking */}
        {(task.estimatedHours || task.actualHours) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcon name="access-time" size={16} color="#6B7280" />
              <Text style={{ color: '#6B7280', fontSize: 14, marginLeft: 8 }}>Time</Text>
            </View>
            <Text style={{ color: '#111827', fontWeight: '600', fontSize: 14 }}>
              {task.actualHours || 0}h / {task.estimatedHours || 0}h
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};