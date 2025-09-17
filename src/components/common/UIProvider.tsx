import React, { createContext, useContext, ReactNode } from 'react';
import { ActionDialog } from './ActionDialog';
import { PermissionDialog } from './PermissionDialog';
import { useActionDialog } from '../../hooks/useActionDialog';
import { useToast } from '../../contexts/ToastContext';
import type { ActionDialogAction } from './ActionDialog';

interface UIContextType {
  // Toast methods
  showToast: (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
    options?: {
      duration?: number;
      action?: {
        text: string;
        onPress: () => void;
      };
    }
  ) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  
  // Dialog methods
  showDialog: (options: {
    title: string;
    message?: string;
    actions: ActionDialogAction[];
    icon?: string;
    type?: 'info' | 'warning' | 'error' | 'success';
  }) => void;
  
  // Convenience dialog methods
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
    }
  ) => void;
  
  showAlert: (title: string, message: string, onOk?: () => void) => void;
  showErrorAlert: (title: string, message: string, onOk?: () => void) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

interface UIProviderProps {
  children: ReactNode;
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  const toast = useToast();
  const { dialogProps, showDialog: showActionDialog, hideDialog } = useActionDialog();

  const showDialog = (options: {
    title: string;
    message?: string;
    actions: ActionDialogAction[];
    icon?: string;
    type?: 'info' | 'warning' | 'error' | 'success';
  }) => {
    showActionDialog(options);
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      destructive?: boolean;
    }
  ) => {
    showActionDialog({
      title,
      message,
      type: options?.destructive ? 'warning' : 'info',
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
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    showActionDialog({
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
  };

  const showErrorAlert = (title: string, message: string, onOk?: () => void) => {
    showActionDialog({
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
  };

  const contextValue: UIContextType = {
    showToast: toast.showToast,
    showSuccess: toast.showSuccess,
    showError: toast.showError,
    showWarning: toast.showWarning,
    showInfo: toast.showInfo,
    showDialog,
    showConfirm,
    showAlert,
    showErrorAlert,
  };

  return (
    <UIContext.Provider value={contextValue}>
      {children}
      <ActionDialog {...dialogProps} onClose={hideDialog} />
    </UIContext.Provider>
  );
};

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};