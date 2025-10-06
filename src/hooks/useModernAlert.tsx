import { useState, useCallback } from 'react';

interface AlertAction {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message?: string;
  actions: AlertAction[];
  icon?: string;
  iconColor?: string;
}

interface AlertState extends AlertOptions {
  visible: boolean;
}

export const useModernAlert = () => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    actions: [],
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      visible: true,
      ...options,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // Convenience method for delete confirmations
  const showDeleteConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showAlert({
      title,
      message,
      icon: 'delete',
      iconColor: '#EF4444',
      actions: [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onConfirm,
        },
      ],
    });
  }, [showAlert]);

  // Convenience method for general confirmations
  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText: string = 'OK'
  ) => {
    showAlert({
      title,
      message,
      icon: 'help',
      iconColor: '#3B82F6',
      actions: [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: confirmText,
          style: 'default',
          onPress: onConfirm,
        },
      ],
    });
  }, [showAlert]);

  return {
    alertState,
    showAlert,
    hideAlert,
    showDeleteConfirm,
    showConfirm,
  };
};