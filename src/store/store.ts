import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import projectReducer from './slices/projectSlice';
import voiceReducer from './slices/voiceSlice';
import taskReducer from './slices/taskSlice';
import announcementReducer from './slices/announcementSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    project: projectReducer,
    voice: voiceReducer,
    tasks: taskReducer,
    announcements: announcementReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;    