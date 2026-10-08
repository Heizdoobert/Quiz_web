# components/ui/Toast.tsx
lines:70 exports:ToastProvider
---
'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContext, ToastMessage, ToastType } from '@/hooks/use-toast';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />
};

const styles = {
  success: 'border-green-500/20 bg-green-500/10 text-green-50',
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-50',
  warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-50',
  error: 'border-red-500/20 bg-red-500/10 text-red-50'
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const success = useCallback((msg: string) => addToast('success', msg), [addToast]);
  const info = useCallback((msg: string) => addToast('info', msg), [addToast]);
  const warning = useCallback((msg: string) => addToast('warning', msg), [addToast]);
