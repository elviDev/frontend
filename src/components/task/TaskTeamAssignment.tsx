import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, SlideInRight, BounceIn } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { TaskAssignee } from '../../types/task.types';
import { Avatar } from '../common/Avatar';

interface TaskTeamAssignmentProps {
  assignees: TaskAssignee[];
  availableAssignees: TaskAssignee[];
  onToggleAssignee: (assignee: TaskAssignee) => void;
  errors: {
    assignees: string;
  };
}

export const TaskTeamAssignment: React.FC<TaskTeamAssignmentProps> = ({
  assignees,
  availableAssignees,
  onToggleAssignee,
  errors,
}) => {
  return (
    <Animated.View entering={FadeInDown.duration(600)} style={{ gap: 24 }}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ 
            width: 40, 
            height: 40, 
            backgroundColor: '#DBEAFE', 
            borderRadius: 12, 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginRight: 12 
          }}>
            <MaterialIcon name="groups" size={20} color="#3B82F6" />
          </View>
          <View>
            <Text style={{ color: '#111827', fontWeight: 'bold', fontSize: 18 }}>Team Assignment</Text>
            <Text style={{ color: '#6B7280', fontSize: 14 }}>
              Select team members who will work on this task
            </Text>
          </View>
        </View>

        {errors.assignees ? (
          <Animated.View 
            entering={BounceIn} 
            style={{
              backgroundColor: '#FEF2F2',
              borderWidth: 1,
              borderColor: '#FECACA',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16
            }}
          >
            <Text style={{ color: '#B91C1C', fontWeight: '500' }}>{errors.assignees}</Text>
          </Animated.View>
        ) : null}

        {availableAssignees.length === 0 ? (
          <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center', 
            paddingVertical: 40,
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E5E7EB'
          }}>
            <MaterialIcon name="groups-off" size={48} color="#9CA3AF" />
            <Text style={{ 
              color: '#6B7280', 
              fontSize: 16, 
              fontWeight: '500',
              marginTop: 12,
              textAlign: 'center'
            }}>No Team Members Available</Text>
            <Text style={{ 
              color: '#9CA3AF', 
              fontSize: 14,
              marginTop: 4,
              textAlign: 'center',
              paddingHorizontal: 20
            }}>Please select a channel first to see available team members for assignment.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {availableAssignees.map((assignee, index) => {
            const isSelected = assignees.some(a => a.id === assignee.id);
            
            return (
              <Animated.View key={assignee.id} entering={SlideInRight.delay(index * 100)}>
                <TouchableOpacity
                  onPress={() => {
                    try {
                      if (onToggleAssignee && typeof onToggleAssignee === 'function') {
                        onToggleAssignee(assignee);
                      }
                    } catch (error) {
                      console.error('Error toggling assignee:', error);
                    }
                  }}
                  style={{
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: isSelected ? '#93C5FD' : '#E5E7EB',
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    ...(isSelected && {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                    }),
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <Avatar user={assignee} size="md" />

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontWeight: 'bold',
                          fontSize: 18,
                          color: isSelected ? '#1E3A8A' : '#111827'
                        }}
                      >
                        {assignee.name}
                      </Text>
                      <Text
                        style={{
                          fontWeight: '500',
                          fontSize: 14,
                          color: isSelected ? '#2563EB' : '#6B7280'
                        }}
                      >
                        {assignee.role}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: isSelected ? '#3B82F6' : '#9CA3AF'
                        }}
                      >
                        {assignee.email}
                      </Text>
                    </View>

                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: isSelected ? '#2563EB' : '#D1D5DB',
                        backgroundColor: isSelected ? '#2563EB' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isSelected && (
                        <MaterialIcon name="check" size={18} color="white" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
          </View>
        )}

        {assignees.length > 0 && (
          <Animated.View 
            entering={BounceIn} 
            style={{
              marginTop: 24,
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
              borderRadius: 16,
              padding: 16
            }}
          >
            <Text style={{ 
              color: '#1E40AF', 
              fontWeight: '600', 
              marginBottom: 12 
            }}>
              Selected Team Members ({assignees.length})
            </Text>
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: 8 
            }}>
              {assignees.map(assignee => (
                <View
                  key={assignee.id}
                  style={{
                    backgroundColor: '#DBEAFE',
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ 
                    color: '#1D4ED8', 
                    fontWeight: '500' 
                  }}>{assignee.name}</Text>
                  <Text style={{ 
                    color: '#2563EB', 
                    fontSize: 14, 
                    marginLeft: 4 
                  }}>• {assignee.role}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
};