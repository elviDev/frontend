import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

export interface ActionDialogAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  icon?: string;
}

export interface ActionDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  actions: ActionDialogAction[];
  onClose: () => void;
  icon?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export const ActionDialog: React.FC<ActionDialogProps> = ({
  visible,
  title,
  message,
  actions,
  onClose,
  icon,
  type = 'info',
}) => {
  const getTypeIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'success':
        return 'check-circle';
      default:
        return 'info';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'warning':
        return '#F59E0B';
      case 'error':
        return '#EF4444';
      case 'success':
        return '#10B981';
      default:
        return '#3B82F6';
    }
  };

  const getActionButtonStyle = (action: ActionDialogAction) => {
    switch (action.style) {
      case 'destructive':
        return {
          backgroundColor: '#EF4444',
          borderColor: '#DC2626',
        };
      case 'cancel':
        return {
          backgroundColor: '#F3F4F6',
          borderColor: '#E5E7EB',
        };
      default:
        return {
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
        };
    }
  };

  const getActionTextStyle = (action: ActionDialogAction) => {
    switch (action.style) {
      case 'cancel':
        return { color: '#374151' };
      default:
        return { color: '#FFFFFF' };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {/* Header with gradient border */}
          <LinearGradient
            colors={['#3933C6', '#A05FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.dialogContent}>
              {/* Icon and Title */}
              <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: getTypeColor() }]}>
                  <MaterialIcon name={getTypeIcon()} size={24} color="white" />
                </View>
                <Text style={styles.title}>{title}</Text>
              </View>

              {/* Message */}
              {message && (
                <View style={styles.messageContainer}>
                  <Text style={styles.message}>{message}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsContainer}>
                {actions.map((action, index) => {
                  const buttonStyle = getActionButtonStyle(action);
                  const textStyle = getActionTextStyle(action);
                  const isCancel = action.style === 'cancel';

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.actionButton,
                        buttonStyle,
                        index < actions.length - 1 &&
                          styles.actionButtonSpacing,
                      ]}
                      onPress={() => {
                        action.onPress();
                        onClose();
                      }}
                    >
                      {!isCancel ? (
                        <View style={styles.buttonContent}>
                          {action.icon && (
                            <MaterialIcon
                              name={action.icon}
                              size={18}
                              color="white"
                              style={styles.buttonIcon}
                            />
                          )}
                          <Text
                            style={[styles.actionText, { color: '#FFFFFF' }]}
                          >
                            {action.text}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.buttonContent}>
                          {action.icon && (
                            <MaterialIcon
                              name={action.icon}
                              size={18}
                              color="#374151"
                              style={styles.buttonIcon}
                            />
                          )}
                          <Text
                            style={[
                              styles.actionText,
                              textStyle,
                              { color: '#374151' },
                            ]}
                          >
                            {action.text}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
  },
  gradientBorder: {
    borderRadius: 16,
    padding: 2,
  },
  dialogContent: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
    overflow: 'hidden',
  },
  actionButtonSpacing: {
    marginRight: 8,
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});