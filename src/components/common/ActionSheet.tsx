import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';

const { height: screenHeight } = Dimensions.get('window');

interface ActionSheetOption {
  text: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
  icon?: string;
  iconLibrary?: 'material' | 'ionicon';
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  title,
  message,
  options,
  onClose,
}) => {
  const handleOptionPress = (option: ActionSheetOption) => {
    onClose();
    // Small delay to ensure modal closes first
    setTimeout(() => {
      option.onPress();
    }, 100);
  };

  const renderIcon = (option: ActionSheetOption) => {
    if (!option.icon) return null;

    const iconColor = option.style === 'destructive' ? '#EF4444' : '#374151';
    const IconComponent = option.iconLibrary === 'ionicon' ? IonIcon : MaterialIcon;

    return (
      <View style={styles.iconContainer}>
        <IconComponent name={option.icon} size={20} color={iconColor} />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={styles.container}>
          {/* Header */}
          {(title || message) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {message && <Text style={styles.message}>{message}</Text>}
            </View>
          )}

          {/* Options */}
          <View style={styles.optionsContainer}>
            {options.map((option, index) => {
              const isDestructive = option.style === 'destructive';
              const isCancel = option.style === 'cancel';
              const isLast = index === options.length - 1;

              return (
                <TouchableOpacity
                  key={`${option.text}-${index}`}
                  style={[
                    styles.option,
                    isCancel && styles.cancelOption,
                    !isLast && !isCancel && styles.optionBorder,
                  ]}
                  onPress={() => handleOptionPress(option)}
                  activeOpacity={0.7}
                >
                  {renderIcon(option)}
                  
                  <Text
                    style={[
                      styles.optionText,
                      isDestructive && styles.destructiveText,
                      isCancel && styles.cancelText,
                    ]}
                  >
                    {option.text}
                  </Text>

                  {!isCancel && (
                    <MaterialIcon
                      name="chevron-right"
                      size={20}
                      color="#999"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.select({ ios: 34, default: 20 }),
    maxHeight: screenHeight * 0.7,
  },
  header: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  optionsContainer: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cancelOption: {
    backgroundColor: '#F8F9FA',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  destructiveText: {
    color: '#EF4444',
  },
  cancelText: {
    color: '#666',
  },
});