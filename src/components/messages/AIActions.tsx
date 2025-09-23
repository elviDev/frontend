import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';

interface AIActionsProps {
  onGenerateSummary: () => void;
  onCreateTasks: () => void;
  isGeneratingSummary?: boolean;
  isCreatingTasks?: boolean;
  messageCount?: number;
}

export const AIActions: React.FC<AIActionsProps> = ({
  onGenerateSummary,
  onCreateTasks,
  isGeneratingSummary = false,
  isCreatingTasks = false,
  messageCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const actions = [
    {
      id: 'summarize',
      title: 'Summarize Chat',
      description: 'Generate a summary of key points and decisions',
      icon: 'summarize',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
      onPress: onGenerateSummary,
      isLoading: isGeneratingSummary,
      disabled: messageCount < 3,
    },
    {
      id: 'tasks',
      title: 'Create Tasks',
      description: 'Extract action items and create tasks',
      icon: 'task-alt',
      color: '#10B981',
      bgColor: '#ECFDF5',
      onPress: onCreateTasks,
      isLoading: isCreatingTasks,
      disabled: messageCount < 2,
    },
    {
      id: 'insights',
      title: 'Generate Insights',
      description: 'Analyze conversation patterns and trends',
      icon: 'insights',
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
      onPress: () => {}, // TODO: Implement insights
      isLoading: false,
      disabled: messageCount < 10,
    },
    {
      id: 'export',
      title: 'Export Chat',
      description: 'Export conversation as PDF or document',
      icon: 'download',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
      onPress: () => {}, // TODO: Implement export
      isLoading: false,
      disabled: messageCount < 1,
    },
  ];

  const mainActions = actions.slice(0, 2);
  const additionalActions = actions.slice(2);

  const renderActionButton = (action: any, isCompact = false) => (
    <TouchableOpacity
      key={action.id}
      onPress={action.onPress}
      disabled={action.disabled || action.isLoading}
      className={`
        ${isCompact ? 'flex-1 mr-2 last:mr-0' : 'w-full mb-2'}
        ${action.disabled ? 'opacity-50' : ''}
      `}
    >
      <View
        className={`
          p-4 rounded-xl border border-gray-100
          ${isCompact ? 'items-center' : 'flex-row items-center'}
        `}
        style={{
          backgroundColor: action.bgColor,
          shadowColor: action.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View
          className={`
            w-10 h-10 rounded-full items-center justify-center
            ${isCompact ? 'mb-2' : 'mr-3'}
          `}
          style={{ backgroundColor: action.color }}
        >
          {action.isLoading ? (
            <MaterialIcon name="refresh" size={20} color="white" />
          ) : (
            <MaterialIcon name={action.icon} size={20} color="white" />
          )}
        </View>

        <View className={isCompact ? 'items-center' : 'flex-1'}>
          <Text
            className={`
              font-semibold text-gray-900
              ${isCompact ? 'text-sm text-center' : 'text-base'}
            `}
          >
            {action.title}
          </Text>
          {!isCompact && (
            <Text className="text-gray-600 text-sm mt-0.5">
              {action.description}
            </Text>
          )}
          {action.isLoading && (
            <Text className="text-gray-500 text-xs mt-1">
              Processing...
            </Text>
          )}
        </View>

        {!isCompact && !action.isLoading && (
          <Feather name="chevron-right" size={16} color={action.color} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="bg-white border-b border-gray-100">
      <View className="px-4 py-3">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-2">
              <MaterialIcon name="auto-awesome" size={16} color="#8B5CF6" />
            </View>
            <Text className="text-gray-900 font-semibold text-base">
              AI Actions
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => setIsExpanded(!isExpanded)}
            className="p-1"
          >
            <MaterialIcon 
              name={isExpanded ? "expand-less" : "expand-more"} 
              size={20} 
              color="#6B7280" 
            />
          </TouchableOpacity>
        </View>

        {/* Message Count Info */}
        {messageCount > 0 && (
          <Text className="text-gray-500 text-sm mb-3">
            {messageCount} messages available for analysis
          </Text>
        )}

        {/* Main Actions (Always Visible) */}
        <View className="flex-row">
          {mainActions.map(action => (
            <React.Fragment key={action.id}>
              {renderActionButton(action, true)}
            </React.Fragment>
          ))}
        </View>

        {/* Additional Actions (Expandable) */}
        {isExpanded && (
          <View className="mt-3 pt-3 border-t border-gray-100">
            <Text className="text-gray-700 font-medium text-sm mb-2">
              More Actions
            </Text>
            {additionalActions.map(action => (
              <React.Fragment key={action.id}>
                {renderActionButton(action, false)}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Quick Tips */}
        {messageCount < 3 && (
          <View className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <View className="flex-row items-center mb-1">
              <MaterialIcon name="lightbulb" size={16} color="#3B82F6" />
              <Text className="ml-1 text-blue-700 font-medium text-sm">
                Tip
              </Text>
            </View>
            <Text className="text-blue-600 text-sm">
              AI actions become more effective with more conversation content. 
              Keep chatting to unlock powerful analysis features!
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};