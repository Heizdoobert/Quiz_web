'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContext, ToastMessage, ToastType } from '@/hooks/shared/use-toast';
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
  const error = useCallback((msg: string) => addToast('error', msg), [addToast]);

  // Only the stable callbacks go in the context: consumers put `toast` in effect deps, so a value
  // that changed with every toast would re-run those effects (and re-fire their requests).
  const value = useMemo(
    () => ({ success, info, warning, error, removeToast }),
    [success, info, warning, error, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="region" aria-label="Notifications" aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border backdrop-blur-md shadow-lg ${styles[toast.type]}`}
            >
              <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
              <div className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="flex-shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
