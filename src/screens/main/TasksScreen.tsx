import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import Animated, {
  FadeInUp,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  Task,
  TaskFilter,
  TaskSort,
  TaskStats,
  TaskStatus,
} from '../../types/task.types';
import { MainStackParamList } from '../../types/navigation.types';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchTasks,
  fetchTaskStats,
  selectTasks,
  selectTaskStats,
  selectTasksLoading,
  selectViewMode,
  selectActiveFilters,
  setViewMode,
  setActiveFilters,
  setSearchQuery,
} from '../../store/slices/taskSlice';
import { TasksHeader } from '../../components/task/TasksHeader';
import { TaskStatsCards } from '../../components/task/TaskStatsCards';
import { TaskSearchAndFilters } from '../../components/task/TaskSearchAndFilters';
import { TaskFilterModal } from '../../components/task/TaskFilterModal';
import { TaskViewRenderer } from '../../components/task/TaskViewRenderer';
import { TaskCard } from '../../components/task/TaskCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useWebSocket } from '../../services/websocketService';
import Feather from 'react-native-vector-icons/Feather';

type TasksScreenNavigationProp = NativeStackNavigationProp<MainStackParamList>;

export const TasksScreen: React.FC = () => {
  const navigation = useNavigation<TasksScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { isConnected } = useWebSocket();
  const isFocused = useIsFocused();

  // Navigation safety state
  const [navigationReady, setNavigationReady] = useState(false);

  // Check navigation readiness
  useEffect(() => {
    if (navigation && isFocused) {
      setNavigationReady(true);
      console.log('TasksScreen: Navigation context ready');
    } else {
      setNavigationReady(false);
      console.log('TasksScreen: Navigation context not ready');
    }
  }, [navigation, isFocused]);

  // Redux state
  const tasks = useSelector(selectTasks);
  const taskStats = useSelector(selectTaskStats);
  const loading = useSelector(selectTasksLoading);
  const viewModeState = useSelector(selectViewMode);
  const activeFilters = useSelector(selectActiveFilters);

  // Debug logging for state
  useEffect(() => {
    console.log('TasksScreen: Redux state updated:', {
      tasksCount: tasks.length,
      loading,
      viewMode: viewModeState,
      activeFilters,
      taskStats
    });
  }, [tasks, loading, viewModeState, activeFilters, taskStats]);

  // Local state
  const [searchQueryLocal, setSearchQueryLocal] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<TaskSort>({
    field: 'due_date',
    direction: 'asc',
  });
  const [viewModeError, setViewModeError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Handle view mode compatibility
  const compatibleViewMode = viewModeState === 'timeline' ? 'list' : viewModeState as 'list' | 'board' | 'calendar';

  // Animation values
  const headerScale = useSharedValue(1);
  const filterButtonScale = useSharedValue(1);

  // Load tasks on component mount
  useEffect(() => {
    console.log('TasksScreen: Component mounted, loading tasks...');
    loadTasks();
    loadTaskStats();
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadTasks();
  }, [activeFilters]);

  // Reload tasks when screen is focused (e.g., after creating a new task)
  useEffect(() => {
    if (isFocused) {
      console.log('TasksScreen: Screen focused, reloading tasks...');
      loadTasks();
      loadTaskStats();
    }
  }, [isFocused]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch(setSearchQuery(searchQueryLocal));
      if (searchQueryLocal) {
        loadTasks();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQueryLocal]);

  const loadTasks = async () => {
    try {
      console.log('TasksScreen: Loading tasks with filters:', {
        ...activeFilters,
        search: searchQueryLocal || undefined,
        limit: 50,
      });
      
      const result = await dispatch(fetchTasks({
        ...activeFilters,
        search: searchQueryLocal || undefined,
        limit: 50,
      })).unwrap();
      
      console.log('TasksScreen: Tasks loaded successfully:', {
        taskCount: result?.data?.length || 0,
        hasData: !!result?.data,
        pagination: result?.pagination
      });
    } catch (error: any) {
      console.error('TasksScreen: Failed to load tasks:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        statusCode: error?.statusCode,
        details: error?.details
      });
      
      // Don't re-throw the error - let the UI continue to function
      // The Redux state will have the error message and tasks might still be visible
    }
  };

  const loadTaskStats = async () => {
    try {
      await dispatch(fetchTaskStats()).unwrap();
    } catch (error) {
      console.error('Failed to load task stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadTasks(),
      loadTaskStats(),
    ]);
    setRefreshing(false);
  };


  // Use Redux taskStats or compute from tasks if not available
  const displayStats = useMemo((): TaskStats => {
    // If we have taskStats from Redux, use them
    if (taskStats) {
      return taskStats;
    }

    // Otherwise compute stats from tasks
    const stats: TaskStats = {
      totalTasks: tasks.length,
      tasksByStatus: {
        pending: 0,
        in_progress: 0,
        review: 0,
        completed: 0,
        cancelled: 0,
        on_hold: 0,
      },
      tasksByPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
        critical: 0,
      },
      overdueTasks: 0,
      completedThisWeek: 0,
      averageCompletionTime: 0,
    };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    tasks.forEach(task => {
      // Status counts
      if (stats.tasksByStatus[task.status] !== undefined) {
        stats.tasksByStatus[task.status]++;
      }
      
      // Priority counts  
      if (stats.tasksByPriority[task.priority] !== undefined) {
        stats.tasksByPriority[task.priority]++;
      }

      // Overdue count
      const dueDate = task.due_date || task.dueDate;
      if (dueDate) {
        const dueDateObj = new Date(dueDate);
        if (dueDateObj < now && task.status !== 'completed' && task.status !== 'cancelled') {
          stats.overdueTasks++;
        }
      }

      // Completed this week
      const completedAt = task.completed_at || task.completedAt;
      if (task.status === 'completed' && completedAt) {
        const completedDate = new Date(completedAt);
        if (completedDate >= weekAgo) {
          stats.completedThisWeek++;
        }
      }
    });

    return stats;
  }, [tasks, taskStats]);

  // Filtered tasks are now handled by Redux state
  const filteredTasks = useMemo(() => {
    return tasks; // Redux already handles filtering
  }, [tasks]);

  // Animation handlers
  const handleFilterPress = () => {
    filterButtonScale.value = withSpring(0.95, {}, () => {
      filterButtonScale.value = withSpring(1);
    });
    runOnJS(setShowFilters)(true);
  };

  // Event handlers
  const handleTaskPress = (task: Task) => {
    try {
      if (!navigation || !navigationReady) {
        console.error('TasksScreen: Navigation not ready for task navigation');
        return;
      }
      navigation.navigate('TaskDetailScreen', { taskId: task.id });
    } catch (error) {
      console.error(
        'TasksScreen: Error navigating to TaskDetailScreen:',
        error,
      );
      // Retry after a brief delay
      setTimeout(() => {
        try {
          if (navigation && navigationReady) {
            navigation.navigate('TaskDetailScreen', { taskId: task.id });
          }
        } catch (retryError) {
          console.error('TasksScreen: Retry navigation failed:', retryError);
        }
      }, 100);
    }
  };

  const handleTaskLongPress = (_task: Task) => {
    try {
      // Future: implement multi-select functionality
      console.log('Long press detected');
    } catch (error) {
      console.warn('TasksScreen: Error in handleTaskLongPress:', error);
    }
  };

  const handleCreateTask = useCallback(() => {
    try {
      // Check if navigation is available and ready before attempting to navigate
      if (!navigation || !navigationReady) {
        console.error('TasksScreen: Navigation context not available or not ready');
        return;
      }
      
      console.log('TasksScreen: Navigating to TaskCreateScreen');
      navigation.navigate('TaskCreateScreen', {});
    } catch (error) {
      console.error(
        'TasksScreen: Error navigating to TaskCreateScreen:',
        error,
      );
      // Retry after a brief delay if navigation context becomes available
      setTimeout(() => {
        try {
          if (navigation && navigationReady) {
            navigation.navigate('TaskCreateScreen', {});
          }
        } catch (retryError) {
          console.error('TasksScreen: Retry navigation failed:', retryError);
        }
      }, 100);
    }
  }, [navigation, navigationReady]);

  const handleFilterClear = () => {
    dispatch(setActiveFilters({}));
    setShowFilters(false);
  };

  const handleSortPress = () => {
    setSortBy(prev => ({
      ...prev,
      direction: prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Render functions
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
      onPress={handleTaskPress}
      onLongPress={handleTaskLongPress}
      viewMode="list"
    />
  );

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <TasksHeader
        viewMode={compatibleViewMode}
        onViewModeChange={mode => {
          try {
            console.log('TasksScreen: Switching to view mode:', mode);
            setViewModeError(null);
            dispatch(setViewMode(mode));
          } catch (error) {
            console.error('TasksScreen: Error switching view mode:', error);
            setViewModeError(`Failed to switch to ${mode} view: ${error}`);
          }
        }}
        onCreateTask={handleCreateTask}
        headerScale={headerScale}
      />

      {/* Stats Cards */}
      <View className="p-2">
        <TaskStatsCards taskStats={displayStats} />
      </View>

      {/* Search and Filters */}
      <TaskSearchAndFilters
        searchQuery={searchQueryLocal}
        isSearchFocused={isSearchFocused}
        onSearchChange={setSearchQueryLocal}
        onSearchFocus={() => setIsSearchFocused(true)}
        onSearchBlur={() => setIsSearchFocused(false)}
        onFilterPress={handleFilterPress}
        onSortPress={handleSortPress}
        filterButtonScale={filterButtonScale}
      />

      {/* Error Display */}
      {viewModeError && (
        <View className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <Text className="text-red-600 font-semibold">View Mode Error</Text>
          <Text className="text-red-500 text-sm mt-1">{viewModeError}</Text>
        </View>
      )}

      {/* Task Views with Error Handling */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
        </View>
      ) : (
        <TaskViewRenderer
          tasks={filteredTasks}
          viewMode={compatibleViewMode}
          searchQuery={searchQueryLocal}
          onTaskPress={handleTaskPress}
          onTaskLongPress={handleTaskLongPress}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* Filter Modal */}
      <TaskFilterModal
        visible={showFilters}
        selectedFilter={activeFilters}
        onClose={() => setShowFilters(false)}
        onFilterChange={(filters) => dispatch(setActiveFilters(filters))}
        onClearAll={handleFilterClear}
      />
    </View>
  );
};
