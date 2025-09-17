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

export interface PermissionDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onAllow: () => void;
  onDeny: () => void;
  onClose: () => void;
  permissionType: 'microphone' | 'camera' | 'storage' | 'location' | 'notifications';
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  visible,
  title,
  message,
  onAllow,
  onDeny,
  onClose,
  permissionType,
}) => {
  const getPermissionIcon = () => {
    switch (permissionType) {
      case 'microphone':
        return 'mic';
      case 'camera':
        return 'camera-alt';
      case 'storage':
        return 'folder';
      case 'location':
        return 'location-on';
      case 'notifications':
        return 'notifications';
      default:
        return 'security';
    }
  };

  const getPermissionColor = () => {
    switch (permissionType) {
      case 'microphone':
        return '#EF4444';
      case 'camera':
        return '#10B981';
      case 'storage':
        return '#F59E0B';
      case 'location':
        return '#8B5CF6';
      case 'notifications':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={['#3933C6', '#A05FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.dialogContent}>
              {/* Permission Icon */}
              <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: getPermissionColor() }]}>
                  <MaterialIcon name={getPermissionIcon()} size={32} color="white" />
                </View>
                <View style={styles.lockIconContainer}>
                  <MaterialIcon name="security" size={20} color="#6B7280" />
                </View>
              </View>

              {/* Title and Message */}
              <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
              </View>

              {/* Permission Benefits */}
              <View style={styles.benefitsContainer}>
                <View style={styles.benefitItem}>
                  <MaterialIcon name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.benefitText}>Required for app functionality</Text>
                </View>
                <View style={styles.benefitItem}>
                  <MaterialIcon name="shield" size={16} color="#10B981" />
                  <Text style={styles.benefitText}>Your privacy is protected</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.denyButton]}
                  onPress={() => {
                    onDeny();
                    onClose();
                  }}
                >
                  <Text style={styles.denyText}>Not Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    onAllow();
                    onClose();
                  }}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.allowGradient}
                  >
                    <MaterialIcon name="check" size={18} color="white" style={styles.buttonIcon} />
                    <Text style={styles.allowText}>Allow</Text>
                  </LinearGradient>
                </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
  },
  gradientBorder: {
    borderRadius: 20,
    padding: 2,
  },
  dialogContent: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  lockIconContainer: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 28,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    minHeight: 52,
    overflow: 'hidden',
  },
  denyButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allowGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  denyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  allowText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});