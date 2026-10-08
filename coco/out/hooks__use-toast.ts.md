# hooks/use-toast.ts
lines:30 exports:ToastType,ToastMessage,ToastContextType,ToastContext,useToast
---
'use client';

import { useContext, createContext } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export interface ToastContextType {
  toasts: ToastMessage[];
  success: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
