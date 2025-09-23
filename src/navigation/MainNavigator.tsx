import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { ChannelDetailScreen } from '../screens/chats/ChannelDetailScreen';
import { ThreadScreen } from '../screens/messages/ThreadScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { TaskCreateScreen } from '../screens/tasks/TaskCreateScreen';
import { UserProfileScreen } from '../screens/users/UserProfileScreen';
import { AdminTaskDashboard } from '../screens/admin/AdminTaskDashboard';

export type MainStackParamList = {
  Tabs: undefined;
  ChannelDetailScreen: {
    channelId: string;
    channelName: string;
    members: any[];
  };
  ThreadScreen: {
    parentMessage: any;
    channelId: string;
    channelName: string;
  };
  TaskDetailScreen: {
    taskId: string;
  };
  TaskCreateScreen: undefined;
  UserProfile: {
    userId?: string;
  };
  AdminDashboard: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Tabs"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="ChannelDetailScreen"
        component={ChannelDetailScreen}
      />
      <Stack.Screen
        name="ThreadScreen"
        component={ThreadScreen}
      />
      <Stack.Screen
        name="TaskDetailScreen"
        component={TaskDetailScreen}
      />
      <Stack.Screen
        name="TaskCreateScreen"
        component={TaskCreateScreen}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminTaskDashboard}
      />
    </Stack.Navigator>
  );
};
