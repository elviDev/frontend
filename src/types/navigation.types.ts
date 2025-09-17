import { NavigatorScreenParams } from '@react-navigation/native';

// Tab Navigator Types
export type TabParamList = {
  Home: undefined;
  Activity: undefined;
  Tasks: undefined;
  Channels: undefined;
};

// Main Stack Navigator Types - Keep in sync with MainNavigator.tsx
export type MainStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  ChannelDetailScreen: {
    channelId: string;
    channelName: string;
    members: any[];
  };
  ThreadScreen: {
    parentMessage: any;
    channelId: string;
    channelName: string;
    members: any[];
    onUpdateMessage: (messageId: string, replies: any[]) => void;
  };
  TaskDetailScreen: {
    taskId: string;
  };
  TaskDetail: {
    taskId: string;
  };
  TaskCreateScreen: {
    taskId?: string;
    channelId?: string;
  };
  TasksScreen: undefined;
  UserProfile: {
    userId?: string;
  };
  AdminDashboard: undefined;
};

// Auth Navigator Types
export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

// Root Navigator Types
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

// Navigation Hook Types
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
