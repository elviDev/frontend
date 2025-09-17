import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import DashboardScreen  from '../screens/main/DashboardScreen';
import { ActivityScreen } from '../screens/main/ActivityScreen';
import { TasksScreen } from '../screens/main/TasksScreen';
import {ChannelsScreen}  from '../screens/main/ChannelsScreen';

const Tab = createBottomTabNavigator();

interface TabIconProps {
  focused: boolean;
  color: string;
  size: number;
  name: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, name }) => {
  const getIcon = () => {
    switch (name) {
      case 'Home':
        return <Feather name="home" size={22} color={focused ? '#6366F1' : '#9CA3AF'} />;
      case 'Activity':
        return <Feather name="bell" size={22} color={focused ? '#6366F1' : '#9CA3AF'} />;
      case 'Tasks':
        return <Feather name="check-square" size={22} color={focused ? '#6366F1' : '#9CA3AF'} />;
      case 'Channels':
        return <Feather name="message-circle" size={22} color={focused ? '#6366F1' : '#9CA3AF'} />;
      default:
        return <Feather name="star" size={22} color={focused ? '#6366F1' : '#9CA3AF'} />;
    }
  };

  return (
    <View className="items-center justify-center" style={{ minWidth: 50 }}>
      <View className="mb-1">
        {getIcon()}
      </View>
      <Text 
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        className={`text-xs font-medium ${
          focused ? 'text-indigo-500' : 'text-gray-400'
        }`}
        style={{ textAlign: 'center', maxWidth: 60 }}
      >
        {name}
      </Text>
    </View>
  );
};

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 75,
          paddingBottom: 10,
          paddingTop: 5,
          paddingHorizontal: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 5,
        },
        tabBarIcon: ({ focused, color, size }) => (
          <TabIcon
            focused={focused}
            color={color}
            size={size}
            name={route.name}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Channels" component={ChannelsScreen} />
    </Tab.Navigator>
  );
};