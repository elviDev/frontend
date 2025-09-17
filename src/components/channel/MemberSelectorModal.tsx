import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email?: string;
  department?: string;
  job_title?: string;
}

interface MemberSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  availableMembers: Member[];
  selectedMembers: Member[];
  loadingMembers: boolean;
  onToggleMember: (member: Member) => void;
}

export const MemberSelectorModal: React.FC<MemberSelectorModalProps> = ({
  visible,
  onClose,
  availableMembers,
  selectedMembers,
  loadingMembers,
  onToggleMember,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        onPress={onClose}
        activeOpacity={1}
      >
        <TouchableOpacity
          style={{ backgroundColor: 'white', borderRadius: 20, padding: 24, margin: 20, maxWidth: 400, width: '90%' }}
          activeOpacity={1}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">Select Members</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            {loadingMembers ? (
              <View className="items-center justify-center py-8">
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text className="text-gray-500 text-sm mt-2">Loading team members...</Text>
              </View>
            ) : (
              availableMembers.map((member) => {
                const isSelected = selectedMembers.some(m => m.id === member.id);
                const isCurrentUser = availableMembers.length > 0 && member.id === availableMembers[0].id;
                return (
                  <TouchableOpacity
                    key={member.id}
                    onPress={() => !isCurrentUser && onToggleMember(member)}
                    disabled={isCurrentUser}
                    className={`flex-row items-center justify-between py-3 border-b border-gray-100 ${
                      isCurrentUser ? 'opacity-50' : ''
                    }`}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 bg-purple-600 rounded-full items-center justify-center mr-3">
                        <Text className="text-white font-bold">
                          {typeof member.avatar === 'string' && member.avatar.length === 1 
                            ? member.avatar 
                            : member.name.charAt(0).toUpperCase()
                          }
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 font-medium">
                          {member.name}
                        </Text>
                        <Text className="text-gray-500 text-sm">{member.role}</Text>
                        {member.department && (
                          <Text className="text-gray-400 text-xs">{member.department}</Text>
                        )}
                      </View>
                    </View>
                    <View
                      className={`w-6 h-6 rounded border-2 items-center justify-center ${
                        isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Feather name="check" size={14} color="white" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity
            onPress={onClose}
            className="bg-purple-600 rounded-xl py-3 mt-6"
          >
            <Text className="text-white font-medium text-center">Done</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};