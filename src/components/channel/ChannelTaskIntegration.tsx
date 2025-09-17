import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../../store/store';
import {
  fetchTasks,
  createTask,
  selectChannelTasks,
  selectTasksLoading,
  updateTask,
} from '../../store/slices/taskSlice';
import { Task, CreateTaskData } from '../../types/task.types';
import { TaskCard } from '../task/TaskCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';

interface ChannelTaskIntegrationProps {
  channelId: string;
  channelName: string;
  members: string[];
  visible: boolean;
  onClose: () => void;
  initialTaskData?: Partial<CreateTaskData>;
}

export const ChannelTaskIntegration: React.FC<ChannelTaskIntegrationProps> = ({
  channelId,
  channelName,
  members,
  visible,
  onClose,
  initialTaskData,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const channelTasks = useSelector(selectChannelTasks(channelId));
  const tasksLoading = useSelector(selectTasksLoading);
  const toast = useToast();
  
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const slideAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      loadChannelTasks();
      animateIn();
    }
  }, [visible, channelId]);

  const animateIn = () => {
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => onClose());
  };

  const loadChannelTasks = async () => {
    try {
      await dispatch(fetchTasks({ 
        channel: [channelId],
        limit: 50,
      })).unwrap();
    } catch (error) {
      console.error('Failed to load channel tasks:', error);
    }
  };

  const handleCreateTask = async (taskData: CreateTaskData) => {
    try {
      const newTaskData: CreateTaskData = {
        ...taskData,
        ...initialTaskData,
        channelId,
        assignees: taskData.assignees || members.slice(0, 5), // Limit to first 5 members
      };

      await dispatch(createTask(newTaskData)).unwrap();
      
      toast.showSuccess(`Task "${taskData.title}" linked to ${channelName}`);
      
      setShowCreateTask(false);
      loadChannelTasks(); // Refresh the list
    } catch (error) {
      toast.showError((error as Error).message || 'Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      await dispatch(updateTask({ 
        taskId, 
        updates: { status } 
      })).unwrap();
      
      toast.showSuccess(`Task status changed to ${status}`);
    } catch (error) {
      toast.showError((error as Error).message || 'Update failed');
    }
  };

  const handleTaskAction = (task: Task, action: string) => {
    switch (action) {
      case 'start':
        handleUpdateTaskStatus(task.id, 'in-progress');
        break;
      case 'complete':
        Alert.alert(
          'Complete Task',
          `Mark "${task.title}" as completed?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Complete', onPress: () => handleUpdateTaskStatus(task.id, 'completed') }
          ]
        );
        break;
      case 'pause':
        handleUpdateTaskStatus(task.id, 'on-hold');
        break;
      case 'review':
        handleUpdateTaskStatus(task.id, 'completed'); // Changed from 'review' to 'completed'
        break;
      default:
        setSelectedTask(task);
    }
  };

  const getTasksByStatus = () => {
    const groups = {
      'pending': [] as Task[],
      'in-progress': [] as Task[],
      'completed': [] as Task[],
      'on-hold': [] as Task[],
      'cancelled': [] as Task[],
    };

    channelTasks.forEach(task => {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    });

    return groups;
  };

  const renderTaskList = () => (
    <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
      {channelTasks.length === 0 ? (
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-6xl mb-4">📋</Text>
          <Text className="text-gray-500 text-lg font-medium mb-2">No tasks yet</Text>
          <Text className="text-gray-400 text-center mb-6">
            Create tasks linked to this channel to keep{'\n'}your team organized and focused.
          </Text>
          <TouchableOpacity
            onPress={() => setShowCreateTask(true)}
            className="bg-blue-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Create First Task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="py-4">
          {channelTasks.map(task => (
            <View key={task.id} className="mb-4">
              <TaskCard
                task={task}
                index={0}
                onPress={() => setSelectedTask(task)}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderBoardView = () => {
    const taskGroups = getTasksByStatus();
    const statusConfig = [
      { key: 'pending', label: 'To Do', color: '#F59E0B', tasks: taskGroups.pending },
      { key: 'in-progress', label: 'In Progress', color: '#3B82F6', tasks: taskGroups['in-progress'] },
      { key: 'completed', label: 'Done', color: '#10B981', tasks: taskGroups.completed },
      { key: 'on-hold', label: 'On Hold', color: '#8B5CF6', tasks: taskGroups['on-hold'] },
    ];

    return (
      <ScrollView 
        horizontal 
        className="flex-1" 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {statusConfig.map(status => (
          <View key={status.key} className="w-72 mr-4">
            <View 
              className="px-3 py-2 rounded-lg mb-3"
              style={{ backgroundColor: `${status.color}20` }}
            >
              <Text 
                className="font-semibold text-sm"
                style={{ color: status.color }}
              >
                {status.label} ({status.tasks.length})
              </Text>
            </View>
            
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {status.tasks.map(task => (
                <View key={task.id} className="mb-3">
                  <TaskCard
                    task={task}
                    index={0}
                    onPress={() => setSelectedTask(task)}
                    viewMode="board"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={animateOut}
    >
      <View className="flex-1 bg-black/50">
        <Animated.View
          className="flex-1 bg-white mt-20 rounded-t-3xl"
          style={{
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [500, 0],
                }),
              },
            ],
          }}
        >
          {/* Header */}
          <View className="px-4 py-6 border-b border-gray-200">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-gray-900 text-xl font-bold">Channel Tasks</Text>
                <Text className="text-gray-500 text-sm">{channelName}</Text>
              </View>
              <TouchableOpacity
                onPress={animateOut}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Text className="text-gray-600 text-lg">×</Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg mr-2 ${
                    viewMode === 'list' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                >
                  <Text className={`font-medium ${
                    viewMode === 'list' ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    List
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode('board')}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === 'board' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                >
                  <Text className={`font-medium ${
                    viewMode === 'board' ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    Board
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setShowCreateTask(true)}
                className="bg-blue-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-semibold">+ Add Task</Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            {channelTasks.length > 0 && (
              <View className="flex-row mt-4">
                <View className="flex-1 bg-gray-50 p-3 rounded-lg mr-2">
                  <Text className="text-gray-500 text-xs">Total</Text>
                  <Text className="text-gray-900 font-bold text-lg">{channelTasks.length}</Text>
                </View>
                <View className="flex-1 bg-green-50 p-3 rounded-lg mx-1">
                  <Text className="text-green-600 text-xs">Completed</Text>
                  <Text className="text-green-700 font-bold text-lg">
                    {getTasksByStatus().completed.length}
                  </Text>
                </View>
                <View className="flex-1 bg-blue-50 p-3 rounded-lg ml-2">
                  <Text className="text-blue-600 text-xs">In Progress</Text>
                  <Text className="text-blue-700 font-bold text-lg">
                    {getTasksByStatus()['in-progress'].length}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Content */}
          {tasksLoading ? (
            <View className="flex-1 items-center justify-center">
              <LoadingSpinner size="large" />
            </View>
          ) : viewMode === 'list' ? (
            renderTaskList()
          ) : (
            renderBoardView()
          )}

          {/* Create Task Modal */}
          {showCreateTask && (
            <Modal
              visible={showCreateTask}
              animationType="slide"
              presentationStyle="pageSheet"
            >
              <View className="flex-1 bg-white p-4">
                <Text className="text-lg font-bold mb-4">Create Task</Text>
                <TouchableOpacity
                  onPress={() => setShowCreateTask(false)}
                  className="bg-gray-200 p-3 rounded-lg mb-4"
                >
                  <Text className="text-center">Close (Temporary - Need proper form)</Text>
                </TouchableOpacity>
              </View>
            </Modal>
          )}

          {/* Task Detail Modal */}
          {selectedTask && (
            <Modal
              visible={!!selectedTask}
              animationType="slide"
              presentationStyle="pageSheet"
            >
              <View className="flex-1 bg-white">
                <View className="px-4 py-6 border-b border-gray-200">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-900 text-xl font-bold">Task Details</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedTask(null)}
                      className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                    >
                      <Text className="text-gray-600 text-lg">×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <ScrollView className="flex-1 p-4">
                  <TaskCard
                    task={selectedTask}
                    index={0}
                    onPress={() => {}}
                  />
                  
                  {/* Additional task details and actions would go here */}
                  <View className="mt-6 p-4 bg-gray-50 rounded-xl">
                    <Text className="text-gray-900 font-semibold mb-2">Quick Actions</Text>
                    <View className="flex-row flex-wrap">
                      {selectedTask.status !== 'completed' && (
                        <TouchableOpacity
                          onPress={() => {
                            handleUpdateTaskStatus(selectedTask.id, 'completed');
                            setSelectedTask(null);
                          }}
                          className="bg-green-100 px-4 py-2 rounded-lg mr-2 mb-2"
                        >
                          <Text className="text-green-700 font-medium">Mark Complete</Text>
                        </TouchableOpacity>
                      )}
                      {selectedTask.status === 'pending' && (
                        <TouchableOpacity
                          onPress={() => {
                            handleUpdateTaskStatus(selectedTask.id, 'in-progress');
                            setSelectedTask(null);
                          }}
                          className="bg-blue-100 px-4 py-2 rounded-lg mr-2 mb-2"
                        >
                          <Text className="text-blue-700 font-medium">Start Task</Text>
                        </TouchableOpacity>
                      )}
                      {selectedTask.status === 'in-progress' && (
                        <TouchableOpacity
                          onPress={() => {
                            handleUpdateTaskStatus(selectedTask.id, 'completed');
                            setSelectedTask(null);
                          }}
                          className="bg-purple-100 px-4 py-2 rounded-lg mr-2 mb-2"
                        >
                          <Text className="text-purple-700 font-medium">Ready for Review</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </ScrollView>
              </View>
            </Modal>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};