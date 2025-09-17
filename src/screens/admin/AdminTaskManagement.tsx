import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  selectTasks,
  selectTasksLoading,
  setActiveFilters,
} from '../../store/slices/taskSlice';
import { Task, CreateTaskData, TaskPriority, TaskStatus, TaskType } from '../../types/task.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { TaskCard } from '../../components/task/TaskCard';
import { SEED_TASKS, SEED_USERS } from '../../data/seedData';
import Icon from 'react-native-vector-icons/Feather';

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  category: string;
  assigneeIds: string[];
  channelId: string;
  channelName: string;
  tags: string[];
  dueDate: Date | null;
  estimatedHours: number;
}

const initialFormData: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  category: 'development',
  assigneeIds: [],
  channelId: '',
  channelName: '',
  tags: [],
  dueDate: null,
  estimatedHours: 8,
};

export const AdminTaskManagement: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const tasks = useSelector(selectTasks);
  const tasksLoading = useSelector(selectTasksLoading);
  const { user } = useSelector((state: RootState) => state.auth);
  const toast = useToast();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkOperationMode, setBulkOperationMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSeedDataModal, setShowSeedDataModal] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      await dispatch(fetchTasks({ limit: 100 })).unwrap();
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.showError('Failed to load tasks');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleCreateTask = async () => {
    if (!formData.title.trim()) {
      toast.showError('Task title is required');
      return;
    }

    try {
      const taskData: CreateTaskData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: formData.category,
        assigned_to: formData.assigneeIds,
        channel_id: formData.channelId || undefined,
        tags: formData.tags,
        due_date: formData.dueDate || undefined,
        estimated_hours: formData.estimatedHours,
        created_by: user?.id || 'admin',
      };

      await dispatch(createTask(taskData)).unwrap();
      toast.showSuccess('Task created successfully');
      setShowCreateModal(false);
      setFormData(initialFormData);
      loadTasks();
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Failed to create task');
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      await dispatch(updateTask({ 
        taskId: editingTask.id, 
        updates: {
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          category: formData.category,
          // assignees: formData.assigneeIds,  // Comment out this line as it causes type issues
          channelId: formData.channelId || undefined,
          tags: formData.tags,
          dueDate: formData.dueDate || undefined,
          estimatedHours: formData.estimatedHours,
        }
      })).unwrap();
      
      toast.showSuccess('Task updated successfully');
      setShowEditModal(false);
      setEditingTask(null);
      setFormData(initialFormData);
      loadTasks();
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Failed to update task');
    }
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete \"${task.title}\"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteTask(task.id)).unwrap();
              toast.showSuccess('Task deleted successfully');
              loadTasks();
            } catch (error) {
              toast.showError('Failed to delete task');
            }
          }
        }
      ]
    );
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      category: task.category || 'development',
      assigneeIds: task.assignees?.map(a => a.id) || [],
      channelId: task.channelId || '',
      channelName: task.channelName || '',
      tags: task.tags || [],
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      estimatedHours: task.estimatedHours || 8,
    });
    setShowEditModal(true);
  };

  const loadSeedData = async () => {
    try {
      // Create tasks from seed data
      for (const seedTask of SEED_TASKS) {
        const taskData: CreateTaskData = {
          title: seedTask.title,
          description: seedTask.description,
          priority: seedTask.priority,
          category: seedTask.category,
          assigned_to: seedTask.assignees?.map(a => a.id) || [],
          channel_id: seedTask.channelId,
          tags: seedTask.tags || [],
          due_date: seedTask.dueDate,
          estimated_hours: seedTask.estimatedHours,
          created_by: user?.id || 'admin',
        };

        await dispatch(createTask(taskData)).unwrap();
      }

      toast.showSuccess(`Created ${SEED_TASKS.length} seed tasks`);
      setShowSeedDataModal(false);
      loadTasks();
    } catch (error) {
      toast.showError('Failed to load seed data');
    }
  };

  const handleBulkStatusUpdate = (status: TaskStatus) => {
    if (selectedTasks.size === 0) return;

    const taskIds = Array.from(selectedTasks);
    dispatch(bulkUpdateTasks({ taskIds, updates: { status } }));
    toast.showSuccess(`Updated ${taskIds.length} tasks to ${status}`);
    setSelectedTasks(new Set());
    setBulkOperationMode(false);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const TaskForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <ScrollView className="flex-1 p-6">
      <Text className="text-lg font-bold mb-4">
        {isEdit ? 'Edit Task' : 'Create New Task'}
      </Text>

      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2">Title *</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          value={formData.title}
          onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
          placeholder="Task title"
        />
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2">Description</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white h-24"
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          placeholder="Task description"
          multiline
          textAlignVertical="top"
        />
      </View>

      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-gray-700 font-medium mb-2">Priority</Text>
          <View className="border border-gray-300 rounded-lg bg-white">
            {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(priority => (
              <TouchableOpacity
                key={priority}
                className={`px-3 py-2 ${formData.priority === priority ? 'bg-blue-100' : ''}`}
                onPress={() => setFormData(prev => ({ ...prev, priority }))}
              >
                <Text className={`${formData.priority === priority ? 'text-blue-700 font-medium' : 'text-gray-700'} capitalize`}>
                  {priority}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="flex-1 ml-2">
          <Text className="text-gray-700 font-medium mb-2">Category</Text>
          <View className="border border-gray-300 rounded-lg bg-white">
            {(['development', 'design', 'research', 'testing', 'documentation']).map(category => (
              <TouchableOpacity
                key={category}
                className={`px-3 py-2 ${formData.category === category ? 'bg-blue-100' : ''}`}
                onPress={() => setFormData(prev => ({ ...prev, category }))}
              >
                <Text className={`${formData.category === category ? 'text-blue-700 font-medium' : 'text-gray-700'} capitalize`}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2">Channel</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          value={formData.channelName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, channelName: text }))}
          placeholder="Channel name"
        />
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2">Estimated Hours</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          value={formData.estimatedHours.toString()}
          onChangeText={(text) => setFormData(prev => ({ ...prev, estimatedHours: parseInt(text) || 0 }))}
          placeholder="8"
          keyboardType="numeric"
        />
      </View>

      <View className="flex-row justify-end mt-6">
        <TouchableOpacity
          className="bg-gray-100 px-4 py-2 rounded-lg mr-2"
          onPress={() => {
            if (isEdit) {
              setShowEditModal(false);
              setEditingTask(null);
            } else {
              setShowCreateModal(false);
            }
            setFormData(initialFormData);
          }}
        >
          <Text className="text-gray-700 font-medium">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={isEdit ? handleUpdateTask : handleCreateTask}
        >
          <Text className="text-white font-medium">
            {isEdit ? 'Update' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-gray-900 text-2xl font-bold">Task Management</Text>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => setShowSeedDataModal(true)}
              className="bg-green-100 px-3 py-2 rounded-lg mr-2"
            >
              <Text className="text-green-700 text-sm font-medium">Seed Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              className="bg-blue-500 px-3 py-2 rounded-lg"
            >
              <Text className="text-white text-sm font-medium">+ New Task</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search and Filters */}
        <View className="mb-4">
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white mb-3"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tasks..."
          />
          
          <View className="flex-row">
            <View className="flex-1 mr-2">
              <Text className="text-gray-600 text-sm mb-1">Status</Text>
              <View className="border border-gray-300 rounded-lg bg-white">
                <TouchableOpacity
                  className={`px-3 py-2 ${filterStatus === 'all' ? 'bg-blue-100' : ''}`}
                  onPress={() => setFilterStatus('all')}
                >
                  <Text className={filterStatus === 'all' ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                    All
                  </Text>
                </TouchableOpacity>
                {(['pending', 'in_progress', 'completed', 'on_hold'] as TaskStatus[]).map(status => (
                  <TouchableOpacity
                    key={status}
                    className={`px-3 py-2 ${filterStatus === status ? 'bg-blue-100' : ''}`}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text className={`${filterStatus === status ? 'text-blue-700 font-medium' : 'text-gray-700'} capitalize`}>
                      {status.replace('-', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="flex-1 ml-2">
              <Text className="text-gray-600 text-sm mb-1">Priority</Text>
              <View className="border border-gray-300 rounded-lg bg-white">
                <TouchableOpacity
                  className={`px-3 py-2 ${filterPriority === 'all' ? 'bg-blue-100' : ''}`}
                  onPress={() => setFilterPriority('all')}
                >
                  <Text className={filterPriority === 'all' ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                    All
                  </Text>
                </TouchableOpacity>
                {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(priority => (
                  <TouchableOpacity
                    key={priority}
                    className={`px-3 py-2 ${filterPriority === priority ? 'bg-blue-100' : ''}`}
                    onPress={() => setFilterPriority(priority)}
                  >
                    <Text className={`${filterPriority === priority ? 'text-blue-700 font-medium' : 'text-gray-700'} capitalize`}>
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Bulk Operations */}
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-600 text-sm">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            onPress={() => setBulkOperationMode(!bulkOperationMode)}
            className={`px-3 py-1 rounded-lg ${bulkOperationMode ? 'bg-blue-100' : 'bg-gray-100'}`}
          >
            <Text className={`text-sm font-medium ${bulkOperationMode ? 'text-blue-700' : 'text-gray-700'}`}>
              {bulkOperationMode ? 'Cancel' : 'Bulk Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bulk Operations Bar */}
        {bulkOperationMode && selectedTasks.size > 0 && (
          <View className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Text className="text-blue-900 font-medium mb-2">
              {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
            </Text>
            <View className="flex-row flex-wrap">
              <TouchableOpacity
                onPress={() => handleBulkStatusUpdate('completed')}
                className="bg-green-100 px-3 py-1 rounded-lg mr-2 mb-2"
              >
                <Text className="text-green-700 text-sm font-medium">Complete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleBulkStatusUpdate('in_progress')}
                className="bg-blue-100 px-3 py-1 rounded-lg mr-2 mb-2"
              >
                <Text className="text-blue-700 text-sm font-medium">In Progress</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleBulkStatusUpdate('on_hold')}
                className="bg-yellow-100 px-3 py-1 rounded-lg mr-2 mb-2"
              >
                <Text className="text-yellow-700 text-sm font-medium">On Hold</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Task List */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {tasksLoading ? (
          <LoadingSpinner size="large" />
        ) : filteredTasks.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-6xl mb-4">📋</Text>
            <Text className="text-gray-500 text-lg font-medium mb-2">No tasks found</Text>
            <Text className="text-gray-400 text-center mb-6">
              {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'
              }
            </Text>
            {(!searchQuery && filterStatus === 'all' && filterPriority === 'all') && (
              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                className="bg-blue-500 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Create First Task</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View className="px-4 pb-6">
            {filteredTasks.map(task => (
              <View key={task.id} className="mb-4">
                <View className="flex-row items-center">
                  {bulkOperationMode && (
                    <TouchableOpacity
                      onPress={() => {
                        const newSelection = new Set(selectedTasks);
                        if (newSelection.has(task.id)) {
                          newSelection.delete(task.id);
                        } else {
                          newSelection.add(task.id);
                        }
                        setSelectedTasks(newSelection);
                      }}
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
                      index={0}
                      onPress={() => !bulkOperationMode && handleEditTask(task)}
                    />
                  </View>
                  
                  {!bulkOperationMode && (
                    <View className="flex-row ml-2">
                      <TouchableOpacity
                        onPress={() => handleEditTask(task)}
                        className="bg-blue-100 p-2 rounded-lg mr-2"
                      >
                        <Icon name="edit" size={16} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteTask(task)}
                        className="bg-red-100 p-2 rounded-lg"
                      >
                        <Icon name="trash-2" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Task Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <TaskForm />
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <TaskForm isEdit />
      </Modal>

      {/* Seed Data Modal */}
      <Modal
        visible={showSeedDataModal}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-white rounded-xl p-6 w-full max-w-md">
            <Text className="text-xl font-bold mb-4">Load Seed Data</Text>
            <Text className="text-gray-600 mb-6">
              This will create {SEED_TASKS.length} sample tasks with realistic project scenarios. 
              This helps populate the app with example data for testing.
            </Text>
            
            <View className="flex-row justify-end">
              <TouchableOpacity
                onPress={() => setShowSeedDataModal(false)}
                className="bg-gray-100 px-4 py-2 rounded-lg mr-2"
              >
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={loadSeedData}
                className="bg-green-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Load Seed Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};