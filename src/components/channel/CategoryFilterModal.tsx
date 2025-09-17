import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import IonIcon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface Category {
  id: string;
  name: string;
  description: string;
  count: number;
  color?: string;
  icon?: string;
}

interface CategoryFilterModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategories: string[];
  onToggleCategory: (categoryId: string) => void;
  onClearAll: () => void;
}

export const CategoryFilterModal: React.FC<CategoryFilterModalProps> = ({
  visible,
  onClose,
  categories,
  selectedCategories,
  onToggleCategory,
  onClearAll,
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
          style={{ backgroundColor: 'white', borderRadius: 20, padding: 24, margin: 20, maxWidth: 350, width: '90%' }}
          activeOpacity={1}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900">Filter by Category</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => onToggleCategory(category.id)}
                  className="flex-row items-center justify-between py-3 border-b border-gray-100"
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <IonIcon name={category.icon ?? 'help'} size={20} color={category.color ?? '#6B7280'} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-medium">{category.name}</Text>
                      <Text className="text-gray-500 text-sm">{category.count} channels</Text>
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
            })}
          </ScrollView>

          <View className="flex-row space-x-3 mt-6">
            <TouchableOpacity
              onPress={onClearAll}
              className="flex-1 bg-gray-100 rounded-xl py-3"
            >
              <Text className="text-gray-700 font-medium text-center">Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-purple-600 rounded-xl py-3"
            >
              <Text className="text-white font-medium text-center">Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};