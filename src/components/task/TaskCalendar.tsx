import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { FadeInDown, BounceIn } from 'react-native-reanimated';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Task } from '../../types/task.types';
import { TaskUtils } from './TaskUtils';

interface TaskCalendarProps {
  tasks: Task[];
  onTaskPress: (task: Task) => void;
  onDatePress?: (date: Date) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  tasks: Task[];
  isToday: boolean;
  isPast: boolean;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const TaskCalendar: React.FC<TaskCalendarProps> = ({ 
  tasks, 
  onTaskPress, 
  onDatePress 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();


  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month and its day of week
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();
    
    // Last day of the month
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Days from previous month
    const daysFromPreviousMonth = [];
    if (startDayOfWeek > 0) {
      const prevMonth = new Date(year, month - 1, 0);
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, prevMonth.getDate() - i);
        daysFromPreviousMonth.push({
          date,
          isCurrentMonth: false,
          tasks: tasks.filter(task => {
            const dueDate = task.due_date || task.dueDate;
            return dueDate && new Date(dueDate).toDateString() === date.toDateString();
          }),
          isToday: date.toDateString() === today.toDateString(),
          isPast: date < today && date.toDateString() !== today.toDateString(),
        });
      }
    }

    // Days of current month
    const daysOfCurrentMonth = [];
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      daysOfCurrentMonth.push({
        date,
        isCurrentMonth: true,
        tasks: tasks.filter(task => {
          const dueDate = task.due_date || task.dueDate;
          return dueDate && new Date(dueDate).toDateString() === date.toDateString();
        }),
        isToday: date.toDateString() === today.toDateString(),
        isPast: date < today && date.toDateString() !== today.toDateString(),
      });
    }

    // Days from next month
    const totalDaysShown = daysFromPreviousMonth.length + daysOfCurrentMonth.length;
    const daysFromNextMonth = [];
    const remainingDays = 42 - totalDaysShown; // 6 rows * 7 days = 42
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      daysFromNextMonth.push({
        date,
        isCurrentMonth: false,
        tasks: tasks.filter(task => {
          const dueDate = task.due_date || task.dueDate;
          return dueDate && new Date(dueDate).toDateString() === date.toDateString();
        }),
        isToday: date.toDateString() === today.toDateString(),
        isPast: date < today && date.toDateString() !== today.toDateString(),
      });
    }

    return [...daysFromPreviousMonth, ...daysOfCurrentMonth, ...daysFromNextMonth];
  }, [currentDate, tasks, today]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <View className="bg-white rounded-2xl p-4 mb-4" 
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {/* Calendar Header */}
      <Animated.View 
        entering={FadeInDown.duration(600)}
        className="flex-row items-center justify-between mb-6"
      >
        <TouchableOpacity
          onPress={goToPreviousMonth}
          className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
        >
          <Feather name="chevron-left" size={20} color="#374151" />
        </TouchableOpacity>

        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold text-gray-900">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity
            onPress={goToToday}
            className="mt-1 px-3 py-1 bg-blue-50 rounded-full"
          >
            <Text className="text-blue-600 text-sm font-medium">Today</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={goToNextMonth}
          className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
        >
          <Feather name="chevron-right" size={20} color="#374151" />
        </TouchableOpacity>
      </Animated.View>

      {/* Days of Week Header */}
      <View className="flex-row mb-2">
        {DAYS_OF_WEEK.map((day, index) => (
          <View key={day} className="flex-1 items-center py-2">
            <Text className="text-gray-500 text-sm font-semibold uppercase">
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View className="flex-row flex-wrap">
        {calendarDays.map((calendarDay, index) => {
          const hasHighPriorityTask = calendarDay.tasks.some(
            task => task.priority === 'urgent' || task.priority === 'high'
          );
          const hasOverdueTasks = calendarDay.tasks.some(task => {
            const dueDate = task.due_date || task.dueDate;
            return dueDate && new Date(dueDate) < today && task.status !== 'completed';
          });

          return (
            <Animated.View
              key={`${calendarDay.date.getTime()}-${index}`}
              entering={FadeInDown.delay(index * 20).duration(600)}
              className="w-[14.28%] aspect-square p-1"
            >
              <TouchableOpacity
                onPress={() => {
                  try {
                    onDatePress?.(calendarDay.date);
                    // If there are tasks on this date, show them
                    if (calendarDay.tasks.length > 0) {
                      // Could show a modal or navigate to task list for this date
                    }
                  } catch (error) {
                    console.warn('TaskCalendar: Error handling date press:', error);
                  }
                }}
                className={`flex-1 rounded-lg p-2 ${
                  calendarDay.isToday
                    ? 'bg-blue-500'
                    : hasOverdueTasks
                      ? 'bg-red-50 border border-red-200'
                      : hasHighPriorityTask
                        ? 'bg-orange-50 border border-orange-200'
                        : calendarDay.tasks.length > 0
                          ? 'bg-green-50 border border-green-200'
                          : calendarDay.isPast
                            ? 'bg-gray-50'
                            : 'bg-gray-25'
                }`}
                style={{
                  opacity: calendarDay.isCurrentMonth ? 1 : 0.4,
                }}
              >
                {/* Date Number */}
                <Text
                  className={`text-center font-semibold mb-1 ${
                    calendarDay.isToday
                      ? 'text-white'
                      : hasOverdueTasks
                        ? 'text-red-700'
                        : hasHighPriorityTask
                          ? 'text-orange-700'
                          : calendarDay.tasks.length > 0
                            ? 'text-green-700'
                            : calendarDay.isPast
                              ? 'text-gray-400'
                              : 'text-gray-700'
                  }`}
                  style={{ fontSize: 12 }}
                >
                  {calendarDay.date.getDate()}
                </Text>

                {/* Task Indicators */}
                <View className="flex-1 justify-center items-center">
                  {calendarDay.tasks.length > 0 && (
                    <View className="flex-row flex-wrap justify-center">
                      {calendarDay.tasks.slice(0, 3).map((task, taskIndex) => (
                        <TouchableOpacity
                          key={task.id}
                          onPress={() => {
                            try {
                              onTaskPress(task);
                            } catch (error) {
                              console.warn('TaskCalendar: Error handling task press:', error);
                            }
                          }}
                          className="w-1.5 h-1.5 rounded-full mb-0.5 mr-0.5"
                          style={{
                            backgroundColor: calendarDay.isToday 
                              ? 'white' 
                              : TaskUtils.getPriorityColor(task.priority),
                          }}
                        />
                      ))}
                      {calendarDay.tasks.length > 3 && (
                        <View 
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: calendarDay.isToday ? 'white' : '#9CA3AF',
                          }}
                        />
                      )}
                    </View>
                  )}

                  {/* Task Count */}
                  {calendarDay.tasks.length > 0 && (
                    <Text
                      className={`text-xs font-bold mt-1 ${
                        calendarDay.isToday
                          ? 'text-white'
                          : hasOverdueTasks
                            ? 'text-red-600'
                            : hasHighPriorityTask
                              ? 'text-orange-600'
                              : 'text-green-600'
                      }`}
                      style={{ fontSize: 8 }}
                    >
                      {calendarDay.tasks.length}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Calendar Legend */}
      <Animated.View 
        entering={FadeInDown.delay(800).duration(600)}
        className="flex-row justify-center flex-wrap mt-4 pt-4 border-t border-gray-200"
      >
        <View className="flex-row items-center mr-4 mb-2">
          <View className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
          <Text className="text-xs text-gray-600">Today</Text>
        </View>
        <View className="flex-row items-center mr-4 mb-2">
          <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
          <Text className="text-xs text-gray-600">Has Tasks</Text>
        </View>
        <View className="flex-row items-center mr-4 mb-2">
          <View className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
          <Text className="text-xs text-gray-600">High Priority</Text>
        </View>
        <View className="flex-row items-center mb-2">
          <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
          <Text className="text-xs text-gray-600">Overdue</Text>
        </View>
      </Animated.View>
    </View>
  );
};