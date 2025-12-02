import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastNotification, ToastData, ToastType } from './ToastNotification';

interface ToastContextType {
  showToast: (message: string, options?: { description?: string; type?: ToastType; duration?: number }) => void;
  success: (message: string, options?: { description?: string; duration?: number }) => void;
  error: (message: string, options?: { description?: string; duration?: number }) => void;
  info: (message: string, options?: { description?: string; duration?: number }) => void;
  warning: (message: string, options?: { description?: string; duration?: number }) => void;
  bet: (message: string, options?: { description?: string; duration?: number }) => void;
  win: (message: string, options?: { description?: string; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    options?: { description?: string; type?: ToastType; duration?: number }
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = {
      id,
      message,
      description: options?.description,
      type: options?.type || 'info',
      duration: options?.duration || 4000,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const success = useCallback((message: string, options?: { description?: string; duration?: number }) => {
    showToast(message, { ...options, type: 'success' });
  }, [showToast]);

  const error = useCallback((message: string, options?: { description?: string; duration?: number }) => {
    showToast(message, { ...options, type: 'error' });
  }, [showToast]);

  const info = useCallback((message: string, options?: { description?: string; duration?: number }) => {
    showToast(message, { ...options, type: 'info' });
  }, [showToast]);

  const warning = useCallback((message: string, options?: { description?: string; duration?: number }) => {
    showToast(message, { ...options, type: 'warning' });
  }, [showToast]);

  const bet = useCallback((message: string, options?: { description?: string; duration?: number }) => {
    showToast(message, { ...options, type: 'bet' });
  }, [showToast]);

  const win = useCallback((message: string, options?: { description?: string; duration?: number }) => {
    showToast(message, { ...options, type: 'win' });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, bet, win }}>
      {children}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};
