import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Toast, ToastType } from '../components/common/Toast';

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    text: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  showToast: (
    message: string,
    type: ToastType,
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
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const generateId = () => `toast_${Date.now()}_${Math.random()}`;

  const showToast = (
    message: string,
    type: ToastType,
    options?: {
      duration?: number;
      action?: {
        text: string;
        onPress: () => void;
      };
    }
  ) => {
    const id = generateId();
    const newToast: ToastData = {
      id,
      message,
      type,
      duration: options?.duration,
      action: options?.action,
    };

    // Remove existing toasts of the same type to prevent spam
    setToasts(prev => prev.filter(toast => toast.type !== type));
    
    // Add new toast
    setToasts(prev => [...prev, newToast]);
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (message: string, duration = 3000) => {
    showToast(message, 'success', { duration });
  };

  const showError = (message: string, duration = 5000) => {
    showToast(message, 'error', { duration });
  };

  const showWarning = (message: string, duration = 4000) => {
    showToast(message, 'warning', { duration });
  };

  const showInfo = (message: string, duration = 4000) => {
    showToast(message, 'info', { duration });
  };

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          visible={true}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          action={toast.action}
          onHide={() => hideToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};