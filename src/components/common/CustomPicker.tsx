import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Colors } from '../../utils/colors';

export interface PickerItem {
  label: string;
  value: string;
}

interface CustomPickerProps {
  label?: string;
  placeholder?: string;
  selectedValue: string;
  items: PickerItem[];
  onValueChange: (value: string) => void;
  error?: string;
  style?: any;
}

export const CustomPicker: React.FC<CustomPickerProps> = ({
  label,
  placeholder = 'Select an option',
  selectedValue,
  items,
  onValueChange,
  error,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const selectedItem = items.find(item => item.value === selectedValue);

  const handleSelect = (value: string) => {
    onValueChange(value);
    setIsVisible(false);
  };

  const renderItem = ({ item }: { item: PickerItem }) => (
    <TouchableOpacity
      style={[styles.item, selectedValue === item.value && styles.selectedItem]}
      onPress={() => handleSelect(item.value)}
    >
      <Text
        style={[
          styles.itemText,
          selectedValue === item.value && styles.selectedItemText,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setIsVisible(true)}
      >
        <Text
          style={[styles.selectorText, !selectedItem && styles.placeholderText]}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {label || 'Select an option'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={item => item.value}
              style={styles.list}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.background, // or use a valid color property
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  selectorError: {
    borderColor: Colors.error,
  },
  selectorText: {
    fontSize: 16,
    color: Colors.text.primary,
    flex: 1,
  },
  placeholderText: {
    color: Colors.text.secondary,
  },
  arrow: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '60%',
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background, // or use a valid color property
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: 'bold',
  },
  list: {
    maxHeight: 300,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  selectedItem: {
    backgroundColor: Colors.primary + '10',
  },
  itemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  selectedItemText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
