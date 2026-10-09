'use client';

import { MotionConfig } from 'framer-motion';
import { SessionProvider } from '@/hooks/shared/use-session';
import { ToastProvider } from '@/components/ui/Toast';
import { WalletBoundary } from '@/components/WalletBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SessionProvider>
        <WalletBoundary>
          <ToastProvider>{children}</ToastProvider>
        </WalletBoundary>
      </SessionProvider>
    </MotionConfig>
  );
}
