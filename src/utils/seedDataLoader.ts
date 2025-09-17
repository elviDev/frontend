import { store } from '../store/store';
import { SEED_TASKS, SEED_ANNOUNCEMENTS } from '../data/seedData';
import { Task } from '../types/task.types';
import { Announcement } from '../types/announcement.types';

// Mock implementations that don't require actual API calls
export const loadSeedTasks = () => {
  // Convert seed data to the format expected by Redux
  const mockTasks: Task[] = SEED_TASKS.map((seedTask, index) => ({
    id: `task-${index + 1}`,
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time within last week
    updatedAt: new Date(),
    completedAt: seedTask.status === 'completed' ? new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000) : undefined,
    ...seedTask,
  }));

  // Directly dispatch to store to bypass async thunks
  store.dispatch({
    type: 'tasks/fetchTasks/fulfilled',
    payload: {
      data: mockTasks,
      pagination: {
        total: mockTasks.length,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    },
  });

  console.log('✅ Loaded', mockTasks.length, 'seed tasks');
  return mockTasks;
};

export const loadSeedAnnouncements = () => {
  // Directly dispatch to store
  store.dispatch({
    type: 'announcements/fetchAnnouncements/fulfilled',
    payload: {
      data: SEED_ANNOUNCEMENTS,
      total: SEED_ANNOUNCEMENTS.length,
    },
  });

  console.log('✅ Loaded', SEED_ANNOUNCEMENTS.length, 'seed announcements');
  return SEED_ANNOUNCEMENTS;
};

export const loadAllSeedData = () => {
  console.log('🌱 Loading all seed data...');
  const tasks = loadSeedTasks();
  const announcements = loadSeedAnnouncements();
  
  console.log('✅ All seed data loaded successfully');
  return { tasks, announcements };
};