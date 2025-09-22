import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { Task } from '../../types/task.types';
import { TaskUtils } from './TaskUtils';

interface TaskDetailsCardProps {
  task: Task;
}

const getBusinessValueColor = (value?: string) => {
  switch (value?.toLowerCase()) {
    case 'critical': return '#DC2626';
    case 'high': return '#EA580C';
    case 'medium': return '#D97706';
    case 'low': return '#65A30D';
    default: return '#6B7280';
  }
};

const getComplexityColor = (complexity?: number) => {
  if (!complexity) return '#6B7280';
  const colors = ['#10B981', '#84CC16', '#EAB308', '#F97316', '#EF4444'];
  return colors[Math.min(complexity - 1, colors.length - 1)] || '#6B7280';
};

const formatBusinessValue = (value?: string) => {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatComplexity = (complexity?: number) => {
  if (!complexity) return null;
  const levels = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
  return levels[Math.min(complexity - 1, levels.length - 1)] || `Level ${complexity}`;
};

const renderReadableText = (item: any): string => {
  if (typeof item === 'string') return item;
  if (typeof item === 'number' || typeof item === 'boolean') return String(item);
  if (typeof item !== 'object' || item === null) return String(item);
  
  // Handle common object patterns
  if (item.title) return item.title;
  if (item.name) return item.name;
  if (item.description) return item.description;
  if (item.text) return item.text;
  if (item.content) return item.content;
  if (item.value) return String(item.value);
  
  // Handle specific patterns for success criteria
  if (item.criterion) return item.criterion;
  if (item.requirement) return item.requirement;
  if (item.goal) return item.goal;
  if (item.metric) return item.metric;
  if (item.target) return `Target: ${item.target}`;
  if (item.expected) return `Expected: ${item.expected}`;
  
  // If it's a simple object with few keys, create a readable format
  const keys = Object.keys(item);
  if (keys.length <= 3) {
    return keys.map(key => `${key}: ${String(item[key])}`).join(', ');
  }
  
  // Fallback to first meaningful value or JSON
  const firstMeaningfulValue = Object.values(item).find(val => 
    val && typeof val === 'string' && val.length > 0
  );
  
  return firstMeaningfulValue ? String(firstMeaningfulValue) : JSON.stringify(item);
};

const formatTaskType = (taskType?: string) => {
  if (!taskType) return null;
  return taskType.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export const TaskDetailsCard: React.FC<TaskDetailsCardProps> = ({ task }) => {
  // Create sections for better organization
  const sections = [];

  // Key Metrics Section
  const keyMetrics = [
    task.task_type && {
      label: 'Type',
      value: formatTaskType(task.task_type),
      icon: 'category',
      color: '#3B82F6'
    },
    task.business_value && {
      label: 'Business Value',
      value: formatBusinessValue(task.business_value),
      icon: 'trending-up',
      color: getBusinessValueColor(task.business_value)
    },
    task.complexity && {
      label: 'Complexity',
      value: formatComplexity(task.complexity),
      icon: 'donut-small',
      color: getComplexityColor(task.complexity)
    }
  ].filter(Boolean);

  if (keyMetrics.length > 0) {
    sections.push({
      title: 'Key Metrics',
      items: keyMetrics
    });
  }

  // Timeline Section
  const timeline = [
    task.start_date && {
      label: 'Start Date',
      value: TaskUtils.formatDueDate(new Date(task.start_date)),
      icon: 'play-arrow',
      color: '#10B981'
    },
    task.owned_by && {
      label: 'Owner',
      value: (task as any).owner_name || task.reporter?.name || `User ${task.owned_by.substring(0, 8)}`,
      icon: 'person',
      color: '#8B5CF6'
    },
    task.watchers && task.watchers.length > 0 && {
      label: 'Watchers',
      value: `${task.watchers.length}`,
      icon: 'visibility',
      color: '#06B6D4'
    }
  ].filter(Boolean);

  if (timeline.length > 0) {
    sections.push({
      title: 'People & Timeline',
      items: timeline
    });
  }

  // Don't render if no meaningful data
  if (sections.length === 0 && !task.voice_created && 
      (!task.custom_fields || Object.keys(task.custom_fields).length === 0) &&
      (!task.labels || Object.keys(task.labels).length === 0)) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInUp.delay(400).duration(600)}
      className="bg-white mx-6 mt-4 rounded-2xl p-6"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <Text className="text-lg font-bold text-gray-900 mb-5">
        Additional Details
      </Text>

      {/* Key Metrics Grid */}
      {sections.map((section, sectionIndex) => (
        <View key={sectionIndex} className="mb-5">
          <Text className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">
            {section.title}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {section.items.map((item: any, index: number) => (
              <View
                key={index}
                className="bg-gray-50 rounded-xl p-4 flex-1 min-w-0"
                style={{ minWidth: 100 }}
              >
                <View className="flex-row items-center mb-2">
                  <MaterialIcon 
                    name={item.icon} 
                    size={16} 
                    color={item.color}
                  />
                  <Text className="text-xs text-gray-500 font-medium ml-2 uppercase tracking-wide">
                    {item.label}
                  </Text>
                </View>
                <Text className="text-gray-900 font-semibold text-sm">
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Voice Instructions */}
      {task.voice_created && task.voice_instructions && (
        <View className="mb-5">
          <Text className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">
            Voice Instructions
          </Text>
          <View className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <View className="flex-row items-center mb-2">
              <MaterialIcon name="mic" size={16} color="#8B5CF6" />
              <Text className="text-purple-700 font-medium text-xs ml-2 uppercase tracking-wide">
                Original Voice Command
              </Text>
            </View>
            <Text className="text-gray-700 italic leading-relaxed">
              "{task.voice_instructions}"
            </Text>
          </View>
        </View>
      )}

      {/* Custom Fields */}
      {task.custom_fields && Object.keys(task.custom_fields).length > 0 && (
        <View className="mb-5">
          <Text className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">
            Custom Fields
          </Text>
          <View className="space-y-3">
            {Object.entries(task.custom_fields).map(([key, value]) => (
              <View key={key} className="flex-row justify-between items-center">
                <Text className="text-gray-600 font-medium capitalize flex-1">
                  {key.replace('_', ' ')}
                </Text>
                <Text className="text-gray-900 font-semibold text-right flex-1">
                  {String(value)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Enhanced Labels Section */}
      {task.labels && Object.keys(task.labels).length > 0 && (
        <View>
          <Text className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-4">
            Additional Information
          </Text>
          <View className="gap-4">
            {Object.entries(task.labels).map(([key, value]) => {
              const labelType = key.toLowerCase();
              
              // Features List
              if (labelType.includes('feature') && Array.isArray(value)) {
                return (
                  <View key={key} className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <View className="flex-row items-center mb-3">
                      <MaterialIcon name="star" size={16} color="#059669" />
                      <Text className="text-green-800 font-semibold text-sm ml-2 capitalize">
                        {key.replace('_', ' ')}
                      </Text>
                      <View className="ml-2 bg-green-200 px-2 py-1 rounded-full">
                        <Text className="text-xs text-green-700 font-medium">{value.length}</Text>
                      </View>
                    </View>
                    {value.map((feature: any, idx: number) => {
                      const isObject = typeof feature === 'object' && feature !== null;
                      const title = isObject ? (feature.title || feature.name || renderReadableText(feature)) : String(feature);
                      const description = isObject ? feature.description : null;
                      
                      return (
                        <View key={idx} className="mb-3 bg-white rounded-lg p-3 border border-green-100">
                          <View className="flex-row items-start">
                            <MaterialIcon name="check-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
                            <View className="ml-3 flex-1">
                              <Text className="text-green-800 font-semibold text-sm mb-1">
                                {title}
                              </Text>
                              {description && (
                                <Text className="text-green-600 text-xs leading-relaxed">
                                  {description}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              }
              
              // Deliverables
              if (labelType.includes('deliverable') && Array.isArray(value)) {
                return (
                  <View key={key} className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <View className="flex-row items-center mb-3">
                      <MaterialIcon name="inventory" size={16} color="#2563EB" />
                      <Text className="text-blue-800 font-semibold text-sm ml-2 capitalize">
                        {key.replace('_', ' ')}
                      </Text>
                      <View className="ml-2 bg-blue-200 px-2 py-1 rounded-full">
                        <Text className="text-xs text-blue-700 font-medium">{value.length}</Text>
                      </View>
                    </View>
                    {value.map((item: any, idx: number) => {
                      const isObject = typeof item === 'object' && item !== null;
                      const title = isObject ? (item.title || item.name || renderReadableText(item)) : String(item);
                      const description = isObject ? item.description : null;
                      
                      return (
                        <View key={idx} className="mb-3 bg-white rounded-lg p-3 border border-blue-100">
                          <View className="flex-row items-start">
                            <MaterialIcon name="assignment" size={16} color="#3B82F6" style={{ marginTop: 2 }} />
                            <View className="ml-3 flex-1">
                              <Text className="text-blue-800 font-semibold text-sm mb-1">
                                {title}
                              </Text>
                              {description && (
                                <Text className="text-blue-600 text-xs leading-relaxed">
                                  {description}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              }
              
              // Success Criteria
              if (labelType.includes('success') || labelType.includes('criteria')) {
                const criteria = Array.isArray(value) ? value : [String(value)];
                return (
                  <View key={key} className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <View className="flex-row items-center mb-3">
                      <MaterialIcon name="verified" size={16} color="#7C3AED" />
                      <Text className="text-purple-800 font-semibold text-sm ml-2 capitalize">
                        {key.replace('_', ' ')}
                      </Text>
                    </View>
                    {criteria.map((criterion: any, idx: number) => {
                      const isObject = typeof criterion === 'object' && criterion !== null;
                      const criteriaText = isObject ? (criterion.criteria || criterion.criterion || criterion.title || renderReadableText(criterion)) : String(criterion);
                      const isMet = isObject ? criterion.met : null;
                      
                      return (
                        <View key={idx} className="mb-3 bg-white rounded-lg p-3 border border-purple-100">
                          <View className="flex-row items-start">
                            <MaterialIcon 
                              name={isMet ? "check-circle" : "flag"} 
                              size={16} 
                              color={isMet ? "#10B981" : "#8B5CF6"} 
                              style={{ marginTop: 2 }} 
                            />
                            <View className="ml-3 flex-1">
                              <View className="flex-row items-center justify-between">
                                <Text className="text-purple-800 font-semibold text-sm flex-1">
                                  {criteriaText}
                                </Text>
                                {isMet !== null && (
                                  <View className={`px-2 py-1 rounded-full ml-2 ${
                                    isMet ? 'bg-green-100' : 'bg-orange-100'
                                  }`}>
                                    <Text className={`text-xs font-medium ${
                                      isMet ? 'text-green-700' : 'text-orange-700'
                                    }`}>
                                      {isMet ? 'Met' : 'Pending'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              }
              
              // Document Links
              if (labelType.includes('link') || labelType.includes('document') || labelType.includes('url')) {
                const links = Array.isArray(value) ? value : [String(value)];
                return (
                  <View key={key} className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <View className="flex-row items-center mb-3">
                      <MaterialIcon name="link" size={16} color="#EA580C" />
                      <Text className="text-orange-800 font-semibold text-sm ml-2 capitalize">
                        {key.replace('_', ' ')}
                      </Text>
                    </View>
                    {links.map((link: any, idx: number) => (
                      <TouchableOpacity key={idx} className="flex-row items-center mb-2 bg-white rounded-lg p-2">
                        <MaterialIcon name="open-in-new" size={14} color="#F97316" />
                        <Text className="text-orange-700 text-sm ml-2 flex-1 underline" numberOfLines={1}>
                          {renderReadableText(link)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              }
              
              // Attached Files
              if (labelType.includes('file') || labelType.includes('attachment')) {
                const files = Array.isArray(value) ? value : [String(value)];
                return (
                  <View key={key} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <View className="flex-row items-center mb-3">
                      <MaterialIcon name="attach-file" size={16} color="#6B7280" />
                      <Text className="text-gray-800 font-semibold text-sm ml-2 capitalize">
                        {key.replace('_', ' ')}
                      </Text>
                      <View className="ml-2 bg-gray-200 px-2 py-1 rounded-full">
                        <Text className="text-xs text-gray-600 font-medium">{files.length}</Text>
                      </View>
                    </View>
                    {files.map((file: any, idx: number) => (
                      <TouchableOpacity key={idx} className="flex-row items-center mb-2 bg-white rounded-lg p-3 border border-gray-100">
                        <MaterialIcon name="description" size={16} color="#9CA3AF" />
                        <Text className="text-gray-700 text-sm ml-3 flex-1" numberOfLines={1}>
                          {renderReadableText(file)}
                        </Text>
                        <MaterialIcon name="download" size={14} color="#6B7280" />
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              }
              
              // Default handling for other label types
              return (
                <View key={key} className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <MaterialIcon name="label" size={14} color="#4F46E5" />
                      <Text className="text-indigo-800 font-medium text-sm ml-2 capitalize flex-1">
                        {key.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text className="text-indigo-700 text-sm font-semibold text-right">
                      {Array.isArray(value) ? `${value.length} items` : String(value)}
                    </Text>
                  </View>
                  
                  {Array.isArray(value) && value.length <= 3 && (
                    <View className="mt-2 ml-6">
                      {value.map((item: any, idx: number) => (
                        <Text key={idx} className="text-indigo-600 text-xs mb-1">
                          • {String(item)}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </Animated.View>
  );
};