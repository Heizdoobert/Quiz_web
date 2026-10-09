'use client';

import { MotionConfig } from 'framer-motion';
import { SessionProvider } from '@/hooks/shared/use-session';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </MotionConfig>
  );
}
