import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Project, Channel, Task } from '../../types/project';

interface ProjectState {
  projects: Project[];
  channels: Channel[];
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  currentProject: Project | null;
}

const initialState: ProjectState = {
  projects: [],
  channels: [],
  tasks: [],
  isLoading: false,
  error: null,
  currentProject: null,
};

export const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.push(action.payload);
      state.currentProject = action.payload;
    },
    addChannel: (state, action: PayloadAction<Channel>) => {
      state.channels.push(action.payload);
    },
    addTask: (state, action: PayloadAction<Task>) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state, action: PayloadAction<{ id: string; updates: Partial<Task> }>) => {
      const taskIndex = state.tasks.findIndex(task => task.id === action.payload.id);
      if (taskIndex >= 0) {
        state.tasks[taskIndex] = { ...state.tasks[taskIndex], ...action.payload.updates };
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  addProject,
  addChannel,
  addTask,
  updateTask,
  clearError,
} = projectSlice.actions;

export default projectSlice.reducer;