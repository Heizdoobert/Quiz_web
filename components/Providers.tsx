'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from '@/hooks/shared/use-session';
import { ToastProvider } from '@/components/ui/Toast';

const AuthPopup = dynamic(() => import('@/components/auth/AuthPopup'), { ssr: false });

// Lives here so any route can call useSession().requireSignIn().
function SignInPopup() {
  const { modalOpen, cancelSignIn, refresh } = useSession();
  return <AuthPopup isOpen={modalOpen} onClose={cancelSignIn} refresh={refresh} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
          <SignInPopup />
        </SessionProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
