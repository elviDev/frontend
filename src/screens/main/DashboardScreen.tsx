import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { HomeAIBot } from '../../components/ai/HomeAIBot';
import { useAuth } from '../../hooks/useAuth';
import { useAuthorization } from '../../contexts/AuthorizationContext';

export type TabParamList = {
  Home: undefined;
  Activity: undefined;
  Tasks: undefined;
  Channels: { openCreateModal?: boolean } | undefined;
};

type DashboardScreenNavigationProp = BottomTabNavigationProp<TabParamList>;

const DashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { user } = useAuth();
  const { canCreateChannels, canCreateTasks } = useAuthorization();
  const [showAIBot, setShowAIBot] = useState(false);

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const handleProfilePress = () => {
    // Navigate to own profile - need to access parent navigator since UserProfile is in Main stack
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      parentNavigation.navigate('UserProfile', { userId: undefined });
    }
  };

  const handleCreateChannel = () => {
    // Navigate to Channels tab and auto-open the create channel modal
    // Since we're already in the TabNavigator, we can navigate directly to Channels
    navigation.navigate('Channels', { openCreateModal: true });
  };

  const handleCreateTask = () => {
    // Navigate to TaskCreateScreen in the parent Main stack
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      parentNavigation.navigate('TaskCreateScreen');
    } else {
      // Fallback: try direct navigation
      navigation.navigate('TaskCreateScreen' as never);
    }
  };


  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Top Right Avatar */}
      <View
        className="absolute top-0 right-4 z-10"
        style={{ top: insets.top + 16 }}
      >
        <TouchableOpacity
          onPress={handleProfilePress}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text className="text-white font-bold text-sm">
              {getUserInitials(user?.name)}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={true}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center items-center px-6">
        <View style={{ marginBottom: 44 }}>
          <MaskedView
            style={{ height: 160, width: 350 }}
            maskElement={
              <View
                style={{
                  backgroundColor: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 36,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    backgroundColor: 'transparent',
                    color: 'black',
                  }}
                >
                  Hello, {user?.name || 'User'}
                </Text>
              </View>
            }
          >
            <LinearGradient
              colors={['#3933C6', '#A05FFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, height: 80 }}
            />
          </MaskedView>
        </View>
        </View>

        <View className="px-4 pb-4">
        {/* Quick Action Buttons - Only show if user has appropriate permissions */}
        {(canCreateChannels() || canCreateTasks()) && (
          <View className="flex-row justify-center mb-6 gap-4">
            {canCreateChannels() && (
              <TouchableOpacity
                className="bg-blue-50 rounded-full px-6 py-3 border border-blue-200 flex-1 max-w-xs"
                onPress={handleCreateChannel}
              >
                <Text className="text-blue-700 text-sm font-medium text-center">
                  Create Channel
                </Text>
              </TouchableOpacity>
            )}

            {canCreateTasks() && (
              <TouchableOpacity
                className="bg-purple-50 rounded-full px-6 py-3 border border-purple-200 flex-1 max-w-xs"
                onPress={handleCreateTask}
              >
                <Text className="text-purple-700 text-sm font-medium text-center">
                  Create Task
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* AI Assistant Button */}
        <TouchableOpacity
          onPress={() => setShowAIBot(true)}
          className="mx-8 mb-6"
        >
          <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl px-6 py-4"
            style={{
              shadowColor: '#8B5CF6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-center">
              <MaterialIcon name="smart-toy" size={24} color="white" />
              <Text className="text-white text-lg font-bold ml-3">
                Ask TT AI
              </Text>
            </View>
            <Text className="text-purple-100 text-center text-sm mt-2">
              {user?.role === 'ceo' 
                ? 'Get insights, manage teams, create announcements' 
                : user?.role === 'manager'
                ? 'Manage teams, track progress, analyze performance'
                : 'Check tasks, deadlines, and get help with work'
              }
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* AI Bot Modal */}
      <HomeAIBot 
        visible={showAIBot} 
        onClose={() => setShowAIBot(false)} 
      />
    </View>
  );
};

export default DashboardScreen;
