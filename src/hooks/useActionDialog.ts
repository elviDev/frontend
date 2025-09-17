import { useState, useCallback } from 'react';
import type { ActionDialogAction, ActionDialogProps } from '../components/common/ActionDialog';

interface ShowActionDialogOptions {
  title: string;
  message?: string;
  actions: ActionDialogAction[];
  icon?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

interface UseActionDialogReturn {
  dialogProps: Omit<ActionDialogProps, 'onClose'>;
  visible: boolean;
  showDialog: (options: ShowActionDialogOptions) => void;
  hideDialog: () => void;
}

export const useActionDialog = (): UseActionDialogReturn => {
  const [visible, setVisible] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<ShowActionDialogOptions>({
    title: '',
    actions: [],
  });

  const showDialog = useCallback((options: ShowActionDialogOptions) => {
    setDialogOptions(options);
    setVisible(true);
  }, []);

  const hideDialog = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    dialogProps: {
      visible,
      ...dialogOptions,
    },
    visible,
    showDialog,
    hideDialog,
  };
};

// Convenience functions for common dialog types
export const createConfirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  options?: {
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    icon?: string;
  }
): ShowActionDialogOptions => ({
  title,
  message,
  type: options?.destructive ? 'warning' : 'info',
  icon: options?.icon,
  actions: [
    {
      text: options?.cancelText || 'Cancel',
      style: 'cancel',
      onPress: onCancel || (() => {}),
    },
    {
      text: options?.confirmText || 'OK',
      style: options?.destructive ? 'destructive' : 'default',
      onPress: onConfirm,
      icon: options?.destructive ? 'delete' : 'check',
    },
  ],
});

export const createInfoDialog = (
  title: string,
  message: string,
  onOk?: () => void
): ShowActionDialogOptions => ({
  title,
  message,
  type: 'info',
  actions: [
    {
      text: 'OK',
      style: 'default',
      onPress: onOk || (() => {}),
      icon: 'check',
    },
  ],
});

export const createErrorDialog = (
  title: string,
  message: string,
  onOk?: () => void
): ShowActionDialogOptions => ({
  title,
  message,
  type: 'error',
  actions: [
    {
      text: 'OK',
      style: 'default',
      onPress: onOk || (() => {}),
    },
  ],
});

export const createWarningDialog = (
  title: string,
  message: string,
  onOk?: () => void
): ShowActionDialogOptions => ({
  title,
  message,
  type: 'warning',
  actions: [
    {
      text: 'OK',
      style: 'default',
      onPress: onOk || (() => {}),
    },
  ],
});

export const createSuccessDialog = (
  title: string,
  message: string,
  onOk?: () => void
): ShowActionDialogOptions => ({
  title,
  message,
  type: 'success',
  actions: [
    {
      text: 'OK',
      style: 'default',
      onPress: onOk || (() => {}),
      icon: 'check',
    },
  ],
});