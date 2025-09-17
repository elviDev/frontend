import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchTasks,
  fetchTaskStats,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  selectTasks,
  selectTaskStats,
  selectTasksLoading,
  setActiveFilters,
} from '../../store/slices/taskSlice';
import { Task, TaskStats } from '../../types/task.types';
import { MainStackParamList } from '../../types/navigation.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { TaskStatsCards } from '../../components/task/TaskStatsCards';
import { TaskFilterModal } from '../../components/task/TaskFilterModal';
import { TaskCard } from '../../components/task/TaskCard';
import { useUI } from '../../components/common/UIProvider';

const { width } = Dimensions.get('window');

export const AdminTaskDashboard: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const dispatch = useDispatch<AppDispatch>();
  const tasks = useSelector(selectTasks);
  const taskStats = useSelector(selectTaskStats);
  const tasksLoading = useSelector(selectTasksLoading);
  const activeFilters = useSelector((state: RootState) => state.tasks.activeFilters);
  const { user } = useSelector((state: RootState) => state.auth);
  const { showSuccess, showError } = useToast();
  const { showConfirm, showDialog } = useUI();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkOperationMode, setBulkOperationMode] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      // Load tasks with admin-level access
      await dispatch(fetchTasks({ 
        limit: 100, 
        // Admin sees all tasks regardless of assignment
      })).unwrap();
      
      // Load statistics
      await dispatch(fetchTaskStats()).unwrap();
    } catch (error) {
      console.error('Failed to load admin dashboard data:', error);
      showError('Failed to load dashboard. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleBulkOperation = async (operation: 'complete' | 'delete' | 'assign' | 'priority') => {
    if (selectedTasks.size === 0) return;

    const taskIds = Array.from(selectedTasks);
    
    try {
      switch (operation) {
        case 'complete':
          // Update each task individually since bulkUpdateTasks is not an async thunk
          for (const taskId of taskIds) {
            await dispatch(updateTask({
              taskId,
              updates: { status: 'completed', completed_at: new Date().toISOString() }
            })).unwrap();
          }
          showSuccess(`${taskIds.length} tasks marked as complete`);
          break;
          
        case 'delete':
          showConfirm(
            'Delete Tasks',
            `Are you sure you want to delete ${taskIds.length} tasks? This action cannot be undone.`,
            async () => {
              for (const taskId of taskIds) {
                await dispatch(deleteTask(taskId)).unwrap();
              }
              showSuccess(`${taskIds.length} tasks deleted successfully`);
            },
            undefined,
            {
              confirmText: 'Delete',
              cancelText: 'Cancel',
              destructive: true,
            }
          );
          break;
          
        case 'priority':
          showDialog({
            title: 'Set Priority',
            message: 'Choose priority level for selected tasks:',
            type: 'info',
            actions: [
              { text: 'Low', style: 'default', onPress: () => updateBulkPriority(taskIds, 'low') },
              { text: 'Medium', style: 'default', onPress: () => updateBulkPriority(taskIds, 'medium') },
              { text: 'High', style: 'default', onPress: () => updateBulkPriority(taskIds, 'high') },
              { text: 'Urgent', style: 'default', onPress: () => updateBulkPriority(taskIds, 'urgent') },
              { text: 'Critical', style: 'default', onPress: () => updateBulkPriority(taskIds, 'critical') },
              { text: 'Cancel', style: 'cancel', onPress: () => {} },
            ]
          });
          break;
      }
      
      // Reset selection after operation
      setSelectedTasks(new Set());
      setBulkOperationMode(false);
      
    } catch (error: any) {
      showError(error.message || 'Operation failed. Please try again.');
    }
  };

  const updateBulkPriority = async (taskIds: string[], priority: Task['priority']) => {
    // Update each task individually since bulkUpdateTasks is not an async thunk
    for (const taskId of taskIds) {
      await dispatch(updateTask({
        taskId,
        updates: { priority }
      })).unwrap();
    }
    
    showSuccess(`${taskIds.length} tasks updated to ${priority} priority`);
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  const selectAllTasks = () => {
    const allTaskIds = tasks.map(task => task.id);
    setSelectedTasks(new Set(allTaskIds));
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
    setBulkOperationMode(false);
  };

  const getTaskDistribution = () => {
    if (!taskStats) return [];
    
    return [
      { label: 'Pending', value: taskStats.tasksByStatus.pending, color: '#F59E0B' },
      { label: 'In Progress', value: taskStats.tasksByStatus.in_progress, color: '#3B82F6' },
      { label: 'Review', value: taskStats.tasksByStatus.review, color: '#8B5CF6' },
      { label: 'Completed', value: taskStats.tasksByStatus.completed, color: '#10B981' },
      { label: 'Cancelled', value: taskStats.tasksByStatus.cancelled, color: '#6B7280' },
      { label: 'On Hold', value: taskStats.tasksByStatus.on_hold, color: '#EF4444' },
    ];
  };

  const getPriorityDistribution = () => {
    if (!taskStats) return [];
    
    return [
      { label: 'Critical', value: taskStats.tasksByPriority.critical, color: '#DC2626' },
      { label: 'Urgent', value: taskStats.tasksByPriority.urgent, color: '#EA580C' },
      { label: 'High', value: taskStats.tasksByPriority.high, color: '#D97706' },
      { label: 'Medium', value: taskStats.tasksByPriority.medium, color: '#0891B2' },
      { label: 'Low', value: taskStats.tasksByPriority.low, color: '#059669' },
    ];
  };

  const getOverduePercentage = () => {
    if (!taskStats || taskStats.totalTasks === 0) return 0;
    return Math.round((taskStats.overdueTasks / taskStats.totalTasks) * 100);
  };

  const renderSimpleChart = (data: Array<{label: string; value: number; color: string}>) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;

    return (
      <View className="mt-4">
        <View className="flex-row mb-3">
          {data.map((item, index) => (
            item.value > 0 && (
              <View 
                key={index}
                className="h-2 rounded-full" 
                style={{ 
                  backgroundColor: item.color, 
                  flex: item.value / total,
                  marginRight: index < data.length - 1 ? 2 : 0 
                }} 
              />
            )
          ))}
        </View>
        <View className="flex-row flex-wrap">
          {data.map((item, index) => (
            item.value > 0 && (
              <View key={index} className="flex-row items-center mr-4 mb-2">
                <View 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }} 
                />
                <Text className="text-sm text-gray-600">
                  {item.label}: {item.value}
                </Text>
              </View>
            )
          ))}
        </View>
      </View>
    );
  };

  if (tasksLoading && !tasks.length) {
    return (
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="mr-3 p-2 rounded-full"
            >
              <MaterialIcon name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-gray-900 text-2xl font-bold">Admin Dashboard</Text>
          </View>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              className="bg-gray-100 px-3 py-2 rounded-lg mr-2"
            >
              <Text className="text-gray-700 text-sm font-medium">Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBulkOperationMode(!bulkOperationMode)}
              className={`px-3 py-2 rounded-lg ${
                bulkOperationMode ? 'bg-blue-100' : 'bg-gray-100'
              }`}
            >
              <Text className={`text-sm font-medium ${
                bulkOperationMode ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {bulkOperationMode ? 'Cancel' : 'Bulk Edit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Range Selector */}
        <View className="flex-row">
          {[
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'all', label: 'All' }
          ].map(range => (
            <TouchableOpacity
              key={range.key}
              onPress={() => setTimeRange(range.key as any)}
              className={`mr-4 pb-2 border-b-2 ${
                timeRange === range.key ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <Text className={`font-medium ${
                timeRange === range.key ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bulk Operations Bar */}
        {bulkOperationMode && (
          <View className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <View className="flex-row items-center justify-between">
              <Text className="text-blue-900 font-medium">
                {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
              </Text>
              <View className="flex-row">
                <TouchableOpacity
                  onPress={selectAllTasks}
                  className="bg-blue-100 px-2 py-1 rounded mr-2"
                >
                  <Text className="text-blue-700 text-xs font-medium">Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={clearSelection}
                  className="bg-gray-100 px-2 py-1 rounded"
                >
                  <Text className="text-gray-700 text-xs font-medium">Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {selectedTasks.size > 0 && (
              <View className="flex-row mt-3">
                <TouchableOpacity
                  onPress={() => handleBulkOperation('complete')}
                  className="bg-green-100 px-3 py-1 rounded-lg mr-2"
                >
                  <Text className="text-green-700 text-sm font-medium">Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBulkOperation('priority')}
                  className="bg-yellow-100 px-3 py-1 rounded-lg mr-2"
                >
                  <Text className="text-yellow-700 text-sm font-medium">Set Priority</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBulkOperation('delete')}
                  className="bg-red-100 px-3 py-1 rounded-lg"
                >
                  <Text className="text-red-700 text-sm font-medium">Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Overview */}
        {taskStats && (
          <View className="p-4">
            <Text className="text-gray-900 text-lg font-semibold mb-4">Overview</Text>
            
            {/* Key Metrics Cards */}
            <View className="flex-row mb-6">
              <View className="flex-1 bg-white p-4 rounded-xl mr-2 shadow-sm">
                <Text className="text-gray-500 text-sm">Total Tasks</Text>
                <Text className="text-gray-900 text-2xl font-bold">{taskStats.totalTasks}</Text>
              </View>
              <View className="flex-1 bg-white p-4 rounded-xl mx-1 shadow-sm">
                <Text className="text-gray-500 text-sm">Overdue</Text>
                <Text className="text-red-600 text-2xl font-bold">{taskStats.overdueTasks}</Text>
                <Text className="text-red-500 text-xs">{getOverduePercentage()}% of total</Text>
              </View>
              <View className="flex-1 bg-white p-4 rounded-xl ml-2 shadow-sm">
                <Text className="text-gray-500 text-sm">Completed This Week</Text>
                <Text className="text-green-600 text-2xl font-bold">{taskStats.completedThisWeek}</Text>
              </View>
            </View>

            {/* Task Status Distribution */}
            <View className="bg-white p-4 rounded-xl mb-4 shadow-sm">
              <Text className="text-gray-900 font-semibold mb-2">Task Status Distribution</Text>
              {renderSimpleChart(getTaskDistribution())}
            </View>

            {/* Priority Distribution */}
            <View className="bg-white p-4 rounded-xl mb-4 shadow-sm">
              <Text className="text-gray-900 font-semibold mb-2">Priority Distribution</Text>
              {renderSimpleChart(getPriorityDistribution())}
            </View>

            {/* Performance Metrics */}
            <View className="bg-white p-4 rounded-xl mb-4 shadow-sm">
              <Text className="text-gray-900 font-semibold mb-3">Performance Metrics</Text>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-600">Average Completion Time</Text>
                <Text className="text-gray-900 font-medium">
                  {taskStats.averageCompletionTime.toFixed(1)} hours
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-600">Completion Rate</Text>
                <Text className="text-gray-900 font-medium">
                  {taskStats.totalTasks > 0 
                    ? ((taskStats.tasksByStatus.completed / taskStats.totalTasks) * 100).toFixed(1)
                    : 0}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Task List */}
        <View className="px-4 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-gray-900 text-lg font-semibold">
              Recent Tasks ({tasks.length})
            </Text>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'overview' ? 'detailed' : 'overview')}
              className="bg-gray-100 px-3 py-1 rounded-lg"
            >
              <Text className="text-gray-700 text-sm">
                {viewMode === 'overview' ? 'Detailed' : 'Overview'}
              </Text>
            </TouchableOpacity>
          </View>

          {tasks.length === 0 ? (
            <View className="bg-white p-8 rounded-xl items-center shadow-sm">
              <Text className="text-4xl mb-2">📋</Text>
              <Text className="text-gray-500 text-lg font-medium">No tasks found</Text>
              <Text className="text-gray-400 text-center mt-2">
                Tasks will appear here when they are created
              </Text>
            </View>
          ) : (
            <View>
              {tasks.slice(0, viewMode === 'overview' ? 10 : 50).map((task, index) => (
                <TouchableOpacity
                  key={task.id}
                  className={`mb-3 ${bulkOperationMode ? 'pl-2' : ''}`}
                  onPress={() => bulkOperationMode 
                    ? toggleTaskSelection(task.id) 
                    : null /* Navigate to task detail */
                  }
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    {bulkOperationMode && (
                      <TouchableOpacity
                        onPress={() => toggleTaskSelection(task.id)}
                        className="mr-3 p-2"
                      >
                        <View className={`w-5 h-5 rounded border-2 items-center justify-center ${
                          selectedTasks.has(task.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedTasks.has(task.id) && (
                            <Text className="text-white text-xs font-bold">✓</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    
                    <View className="flex-1">
                      <TaskCard 
                        task={task} 
                        index={index}
                        onPress={() => {}}
                        viewMode="list"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              
              {tasks.length > 10 && viewMode === 'overview' && (
                <TouchableOpacity
                  onPress={() => setViewMode('detailed')}
                  className="bg-gray-100 p-3 rounded-xl items-center"
                >
                  <Text className="text-gray-700 font-medium">
                    Show {tasks.length - 10} more tasks
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <TaskFilterModal
        visible={showFilterModal}
        selectedFilter={activeFilters}
        onClose={() => setShowFilterModal(false)}
        onFilterChange={(filters) => {
          dispatch(setActiveFilters(filters));
        }}
        onClearAll={() => {
          dispatch(setActiveFilters({}));
        }}
      />
    </View>
  );
};