import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Task, CreateTaskData, TaskFilter, TaskStats } from '../../types/task.types';
import { taskService } from '../../services/api/taskService';

// Utility function to deduplicate tasks by ID
const deduplicateTasks = (tasks: Task[]): Task[] => {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  
  const uniqueTasks = tasks.filter(task => {
    if (seen.has(task.id)) {
      duplicates.push(task.id);
      console.warn(`TaskSlice: Duplicate task found with ID: ${task.id}`, {
        title: task.title,
        status: task.status,
        assignedTo: task.assigned_to || task.assignees
      });
      return false;
    }
    seen.add(task.id);
    return true;
  });
  
  if (duplicates.length > 0) {
    console.error(`TaskSlice: Found ${duplicates.length} duplicate tasks:`, duplicates);
  }
  
  return uniqueTasks;
};

// Async thunks for task operations
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (filters?: TaskFilter & { limit?: number; offset?: number; search?: string }) => {
    const response = await taskService.getTasks(filters);
    return response;
  }
);

export const fetchTask = createAsyncThunk(
  'tasks/fetchTask',
  async (taskId: string) => {
    const response = await taskService.getTask(taskId);
    return response.data;
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData: CreateTaskData) => {
    const response = await taskService.createTask(taskData);
    return response.data;
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
    const response = await taskService.updateTask(taskId, updates);
    return response.data;
  }
);

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateTaskStatus',
  async ({ taskId, status }: { taskId: string; status: Task['status'] }) => {
    const response = await taskService.updateTaskStatus(taskId, status);
    return response.data;
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId: string) => {
    await taskService.deleteTask(taskId);
    return taskId;
  }
);

export const assignTask = createAsyncThunk(
  'tasks/assignTask',
  async ({ taskId, userIds }: { taskId: string; userIds: string[] }) => {
    await taskService.assignTask(taskId, userIds);
    // Fetch updated task to get the latest state
    const response = await taskService.getTask(taskId);
    return response.data;
  }
);

export const fetchTaskStats = createAsyncThunk(
  'tasks/fetchTaskStats',
  async (userId?: string) => {
    const response = await taskService.getTaskStats(userId);
    return response.data;
  }
);

export const searchTasks = createAsyncThunk(
  'tasks/searchTasks',
  async ({ searchTerm, limit, offset }: { searchTerm: string; limit?: number; offset?: number }) => {
    const response = await taskService.searchTasks(searchTerm, limit, offset);
    return response;
  }
);

// Task state interface
interface TaskState {
  // Task lists
  tasks: Task[];
  filteredTasks: Task[];
  searchResults: Task[];
  myTasks: Task[];
  channelTasks: Record<string, Task[]>;
  
  // Current selected task
  selectedTask: Task | null;
  
  // Statistics
  stats: TaskStats | null;
  
  // UI State
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  
  // Pagination
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  
  // Filters and search
  activeFilters: TaskFilter;
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // View mode
  viewMode: 'list' | 'board' | 'calendar' | 'timeline';
  
  // Error handling
  error: string | null;
  lastFetch: number | null;
  
  // Real-time updates
  pendingUpdates: string[]; // task IDs with pending real-time updates
}

const initialState: TaskState = {
  // Task lists
  tasks: [],
  filteredTasks: [],
  searchResults: [],
  myTasks: [],
  channelTasks: {},
  
  // Current selected task
  selectedTask: null,
  
  // Statistics
  stats: null,
  
  // UI State
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  
  // Pagination
  pagination: {
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  },
  
  // Filters and search
  activeFilters: {},
  searchQuery: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
  
  // View mode
  viewMode: 'list',
  
  // Error handling
  error: null,
  lastFetch: null,
  
  // Real-time updates
  pendingUpdates: [],
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    // UI State Management
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Filters and Search
    setActiveFilters: (state, action: PayloadAction<TaskFilter>) => {
      // Clean up empty filter arrays and null/undefined values
      const cleanedFilters: any = {};
      
      Object.entries(action.payload).forEach(([key, value]) => {
        if (key === 'dueDate') {
          if (value && (value.from || value.to)) {
            cleanedFilters[key] = value;
          }
        } else if (Array.isArray(value)) {
          if (value.length > 0) {
            cleanedFilters[key] = value;
          }
        } else if (value !== null && value !== undefined && value !== '') {
          cleanedFilters[key] = value;
        }
      });
      
      state.activeFilters = cleanedFilters as TaskFilter;
      state.filteredTasks = applyFilters(state.tasks, cleanedFilters);
    },
    
    clearFilters: (state) => {
      state.activeFilters = {};
      state.filteredTasks = state.tasks;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    clearSearch: (state) => {
      state.searchQuery = '';
      state.searchResults = [];
    },
    
    // Sorting
    setSortBy: (state, action: PayloadAction<{ field: string; order: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.field;
      state.sortOrder = action.payload.order;
      state.tasks = sortTasks(state.tasks, action.payload.field, action.payload.order);
      state.filteredTasks = sortTasks(state.filteredTasks, action.payload.field, action.payload.order);
    },
    
    // View Mode
    setViewMode: (state, action: PayloadAction<'list' | 'board' | 'calendar' | 'timeline'>) => {
      state.viewMode = action.payload;
    },
    
    // Task Selection
    selectTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload;
    },
    
    // Real-time Updates
    addPendingUpdate: (state, action: PayloadAction<string>) => {
      if (!state.pendingUpdates.includes(action.payload)) {
        state.pendingUpdates.push(action.payload);
      }
    },
    
    removePendingUpdate: (state, action: PayloadAction<string>) => {
      state.pendingUpdates = state.pendingUpdates.filter(id => id !== action.payload);
    },
    
    // Real-time task updates via WebSocket
    taskUpdatedRealtime: (state, action: PayloadAction<Task>) => {
      const updatedTask = action.payload;
      
      // Update in main tasks array
      const taskIndex = state.tasks.findIndex(task => task.id === updatedTask.id);
      if (taskIndex !== -1) {
        state.tasks[taskIndex] = updatedTask;
      }
      
      // Update in filtered tasks
      const filteredIndex = state.filteredTasks.findIndex(task => task.id === updatedTask.id);
      if (filteredIndex !== -1) {
        state.filteredTasks[filteredIndex] = updatedTask;
      }
      
      // Update in channel tasks
      if (updatedTask.channelId && state.channelTasks[updatedTask.channelId]) {
        const channelIndex = state.channelTasks[updatedTask.channelId].findIndex(task => task.id === updatedTask.id);
        if (channelIndex !== -1) {
          state.channelTasks[updatedTask.channelId][channelIndex] = updatedTask;
        }
      }
      
      // Update selected task if it's the same one
      if (state.selectedTask?.id === updatedTask.id) {
        state.selectedTask = updatedTask;
      }
      
      // Remove from pending updates
      state.pendingUpdates = state.pendingUpdates.filter(id => id !== updatedTask.id);
    },
    
    taskCreatedRealtime: (state, action: PayloadAction<Task>) => {
      const newTask = action.payload;
      
      // Check for duplicates before adding
      const existsInTasks = state.tasks.find(task => task.id === newTask.id);
      if (!existsInTasks) {
        // Add to main tasks array (prepend for newest first)
        state.tasks.unshift(newTask);
      }
      
      // Add to channel tasks if applicable
      if (newTask.channelId) {
        if (!state.channelTasks[newTask.channelId]) {
          state.channelTasks[newTask.channelId] = [];
        }
        const existsInChannel = state.channelTasks[newTask.channelId].find(task => task.id === newTask.id);
        if (!existsInChannel) {
          state.channelTasks[newTask.channelId].unshift(newTask);
        }
      }
      
      // Update filtered tasks if it matches current filters
      if (matchesFilters(newTask, state.activeFilters)) {
        const existsInFiltered = state.filteredTasks.find(task => task.id === newTask.id);
        if (!existsInFiltered) {
          state.filteredTasks.unshift(newTask);
        }
      }
      
      // Update pagination only if we actually added the task
      if (!existsInTasks) {
        state.pagination.total += 1;
      }
    },
    
    taskDeletedRealtime: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      
      // Remove from main tasks array
      state.tasks = state.tasks.filter(task => task.id !== taskId);
      
      // Remove from filtered tasks
      state.filteredTasks = state.filteredTasks.filter(task => task.id !== taskId);
      
      // Remove from channel tasks
      Object.keys(state.channelTasks).forEach(channelId => {
        state.channelTasks[channelId] = state.channelTasks[channelId].filter(task => task.id !== taskId);
      });
      
      // Clear selected task if it's the deleted one
      if (state.selectedTask?.id === taskId) {
        state.selectedTask = null;
      }
      
      // Update pagination
      state.pagination.total = Math.max(0, state.pagination.total - 1);
      
      // Remove from pending updates
      state.pendingUpdates = state.pendingUpdates.filter(id => id !== taskId);
    },
    
    // Bulk operations
    bulkUpdateTasks: (state, action: PayloadAction<{ taskIds: string[]; updates: Partial<Task> }>) => {
      const { taskIds, updates } = action.payload;
      
      // Update in all relevant arrays
      [state.tasks, state.filteredTasks].forEach(taskArray => {
        taskArray.forEach((task, index) => {
          if (taskIds.includes(task.id)) {
            taskArray[index] = { ...task, ...updates };
          }
        });
      });
      
      // Update in channel tasks
      Object.keys(state.channelTasks).forEach(channelId => {
        state.channelTasks[channelId].forEach((task, index) => {
          if (taskIds.includes(task.id)) {
            state.channelTasks[channelId][index] = { ...task, ...updates };
          }
        });
      });
      
      // Update selected task if included
      if (state.selectedTask && taskIds.includes(state.selectedTask.id)) {
        state.selectedTask = { ...state.selectedTask, ...updates };
      }
    },
    
    // Reset state
    resetTasks: (state) => {
      Object.assign(state, initialState);
    },
  },
  
  extraReducers: (builder) => {
    // Fetch Tasks
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        
        // Deduplicate tasks before storing
        const uniqueTasks = deduplicateTasks(action.payload.data);
        
        state.tasks = uniqueTasks;
        state.filteredTasks = applyFilters(uniqueTasks, state.activeFilters);
        state.pagination = action.payload.pagination;
        state.lastFetch = Date.now();
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        const errorMessage = action.error.message || 'Failed to fetch tasks';
        state.error = errorMessage;
        
        // Log the error for debugging
        console.error('TaskSlice: fetchTasks rejected:', {
          error: action.error,
          message: errorMessage,
          name: action.error.name,
          stack: action.error.stack
        });
        
        // Keep existing tasks if this was a filter operation that failed
        // This allows the UI to still show data even if the filter failed
        if (state.tasks.length > 0) {
          console.log('TaskSlice: Keeping existing tasks despite filter error');
        }
      })
      
      // Fetch Single Task
      .addCase(fetchTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTask.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedTask = action.payload;
        
        // Update task in arrays if it exists
        const taskIndex = state.tasks.findIndex(task => task.id === action.payload.id);
        if (taskIndex !== -1) {
          state.tasks[taskIndex] = action.payload;
        }
      })
      .addCase(fetchTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch task';
      })
      
      // Create Task
      .addCase(createTask.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.creating = false;
        state.tasks.unshift(action.payload);
        
        // Add to channel tasks if applicable
        if (action.payload.channelId) {
          if (!state.channelTasks[action.payload.channelId]) {
            state.channelTasks[action.payload.channelId] = [];
          }
          state.channelTasks[action.payload.channelId].unshift(action.payload);
        }
        
        // Update filtered tasks
        if (matchesFilters(action.payload, state.activeFilters)) {
          state.filteredTasks.unshift(action.payload);
        }
        
        state.pagination.total += 1;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.creating = false;
        state.error = action.error.message || 'Failed to create task';
      })
      
      // Update Task
      .addCase(updateTask.pending, (state, action) => {
        state.updating = true;
        state.error = null;
        // Add to pending updates for optimistic UI
        state.pendingUpdates.push(action.meta.arg.taskId);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.updating = false;
        const updatedTask = action.payload;
        
        // Update in all arrays
        updateTaskInArrays(state, updatedTask);
        
        // Remove from pending updates
        state.pendingUpdates = state.pendingUpdates.filter(id => id !== updatedTask.id);
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.updating = false;
        state.error = action.error.message || 'Failed to update task';
        // Remove from pending updates on failure
        if (action.meta.arg) {
          state.pendingUpdates = state.pendingUpdates.filter(id => id !== action.meta.arg.taskId);
        }
      })
      
      // Update Task Status
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        const updatedTask = action.payload;
        updateTaskInArrays(state, updatedTask);
      })
      
      // Delete Task
      .addCase(deleteTask.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.deleting = false;
        const taskId = action.payload;
        
        // Remove from all arrays
        removeTaskFromArrays(state, taskId);
        
        state.pagination.total = Math.max(0, state.pagination.total - 1);
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.error.message || 'Failed to delete task';
      })
      
      // Assign Task
      .addCase(assignTask.fulfilled, (state, action) => {
        const updatedTask = action.payload;
        updateTaskInArrays(state, updatedTask);
      })
      
      // Fetch Task Stats
      .addCase(fetchTaskStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      
      // Search Tasks
      .addCase(searchTasks.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload.data;
      })
      .addCase(searchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Search failed';
      });
  },
});

// Helper functions
function applyFilters(tasks: Task[], filters: TaskFilter): Task[] {
  return tasks.filter(task => matchesFilters(task, filters));
}

function matchesFilters(task: Task, filters: TaskFilter): boolean {
  // Status filter - only apply if array exists and is not empty
  if (filters.status && filters.status.length > 0 && !filters.status.includes(task.status)) return false;
  
  // Priority filter - only apply if array exists and is not empty
  if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;
  
  // Handle both assignee field formats
  if (filters.assignee && filters.assignee.length > 0) {
    const taskAssignees = task.assignees || (task.assigned_to ? task.assigned_to.map(id => ({ id })) : []);
    if (!filters.assignee.some(id => taskAssignees.some(assignee => assignee.id === id))) return false;
  }
  
  // Handle both channel field formats
  const taskChannelId = task.channelId || task.channel_id;
  if (filters.channel && filters.channel.length > 0 && taskChannelId && !filters.channel.includes(taskChannelId)) return false;
  
  // Tags filter - only apply if array exists and is not empty
  if (filters.tags && filters.tags.length > 0 && !filters.tags.some(tag => task.tags.includes(tag))) return false;
  
  // Handle both due date field formats
  if (filters.dueDate) {
    const taskDueDate = task.dueDate || task.due_date;
    if (filters.dueDate.from && (!taskDueDate || new Date(taskDueDate) < filters.dueDate.from)) return false;
    if (filters.dueDate.to && (!taskDueDate || new Date(taskDueDate) > filters.dueDate.to)) return false;
  }
  return true;
}

function sortTasks(tasks: Task[], field: string, order: 'asc' | 'desc'): Task[] {
  return [...tasks].sort((a, b) => {
    let aValue = a[field as keyof Task];
    let bValue = b[field as keyof Task];
    
    // Handle date fields
    if (field === 'dueDate' || field === 'createdAt' || field === 'updatedAt') {
      aValue = aValue ? new Date(aValue as string).getTime() : 0;
      bValue = bValue ? new Date(bValue as string).getTime() : 0;
    }
    
    // Handle priority sorting
    if (field === 'priority') {
      const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
      aValue = priorityOrder[aValue as keyof typeof priorityOrder];
      bValue = priorityOrder[bValue as keyof typeof priorityOrder];
    }
    
    if (aValue! < bValue!) return order === 'asc' ? -1 : 1;
    if (aValue! > bValue!) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

function updateTaskInArrays(state: TaskState, updatedTask: Task) {
  // Update in main tasks array
  const taskIndex = state.tasks.findIndex(task => task.id === updatedTask.id);
  if (taskIndex !== -1) {
    state.tasks[taskIndex] = updatedTask;
  }
  
  // Update in filtered tasks
  const filteredIndex = state.filteredTasks.findIndex(task => task.id === updatedTask.id);
  if (filteredIndex !== -1) {
    if (matchesFilters(updatedTask, state.activeFilters)) {
      state.filteredTasks[filteredIndex] = updatedTask;
    } else {
      // Remove from filtered tasks if it no longer matches
      state.filteredTasks.splice(filteredIndex, 1);
    }
  } else if (matchesFilters(updatedTask, state.activeFilters)) {
    // Add to filtered tasks if it now matches
    state.filteredTasks.push(updatedTask);
  }
  
  // Update in channel tasks
  if (updatedTask.channelId && state.channelTasks[updatedTask.channelId]) {
    const channelIndex = state.channelTasks[updatedTask.channelId].findIndex(task => task.id === updatedTask.id);
    if (channelIndex !== -1) {
      state.channelTasks[updatedTask.channelId][channelIndex] = updatedTask;
    }
  }
  
  // Update selected task if it's the same one
  if (state.selectedTask?.id === updatedTask.id) {
    state.selectedTask = updatedTask;
  }
}

function removeTaskFromArrays(state: TaskState, taskId: string) {
  // Remove from main tasks array
  state.tasks = state.tasks.filter(task => task.id !== taskId);
  
  // Remove from filtered tasks
  state.filteredTasks = state.filteredTasks.filter(task => task.id !== taskId);
  
  // Remove from channel tasks
  Object.keys(state.channelTasks).forEach(channelId => {
    state.channelTasks[channelId] = state.channelTasks[channelId].filter(task => task.id !== taskId);
  });
  
  // Remove from search results
  state.searchResults = state.searchResults.filter(task => task.id !== taskId);
  
  // Clear selected task if it's the deleted one
  if (state.selectedTask?.id === taskId) {
    state.selectedTask = null;
  }
}

// Export actions and selectors
export const {
  setLoading,
  setError,
  clearError,
  setActiveFilters,
  clearFilters,
  setSearchQuery,
  clearSearch,
  setSortBy,
  setViewMode,
  selectTask,
  addPendingUpdate,
  removePendingUpdate,
  taskUpdatedRealtime,
  taskCreatedRealtime,
  taskDeletedRealtime,
  bulkUpdateTasks,
  resetTasks,
} = taskSlice.actions;

// Selectors
export const selectTasks = (state: { tasks: TaskState }) => {
  // Check if there are any non-empty filters
  const hasActiveFilters = Object.entries(state.tasks.activeFilters).some(([key, value]) => {
    if (key === 'dueDate') {
      return value && (value.from || value.to);
    }
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
  
  const tasks = hasActiveFilters ? state.tasks.filteredTasks : state.tasks.tasks;
  
  // Extra safety: deduplicate at selector level to prevent React key conflicts
  return deduplicateTasks(tasks);
};
  
export const selectSelectedTask = (state: { tasks: TaskState }) => state.tasks.selectedTask;
export const selectTasksLoading = (state: { tasks: TaskState }) => state.tasks.loading;
export const selectTasksError = (state: { tasks: TaskState }) => state.tasks.error;
export const selectTaskStats = (state: { tasks: TaskState }) => state.tasks.stats;
export const selectSearchResults = (state: { tasks: TaskState }) => state.tasks.searchResults;
export const selectViewMode = (state: { tasks: TaskState }) => state.tasks.viewMode;
export const selectActiveFilters = (state: { tasks: TaskState }) => state.tasks.activeFilters;
export const selectPendingUpdates = (state: { tasks: TaskState }) => state.tasks.pendingUpdates;

// Channel-specific selector
export const selectChannelTasks = (channelId: string) => (state: { tasks: TaskState }) =>
  state.tasks.channelTasks[channelId] || [];

// Complex selectors
export const selectTasksByStatus = (state: { tasks: TaskState }) => {
  const tasks = selectTasks(state);
  return tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = [];
    acc[task.status].push(task);
    return acc;
  }, {} as Record<Task['status'], Task[]>);
};

export const selectOverdueTasks = (state: { tasks: TaskState }) =>
  selectTasks(state).filter(task => 
    task.dueDate && 
    new Date(task.dueDate) < new Date() && 
    task.status !== 'completed' && 
    task.status !== 'cancelled'
  );

export const selectHighPriorityTasks = (state: { tasks: TaskState }) =>
  selectTasks(state).filter(task => 
    task.priority === 'urgent' || task.priority === 'high'
  );

export default taskSlice.reducer;