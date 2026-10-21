# components/Providers.tsx
lines:36 exports:Providers
---
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from '@/hooks/shared/use-session';
import { ToastProvider } from '@/components/ui/Toast';

const loadAuthPopup = () => import('@/components/auth/AuthPopup');
const AuthPopup = dynamic(loadAuthPopup, { ssr: false });

// Lives here so any route can call useSession().requireSignIn().
function SignInPopup() {
  const { modalOpen, cancelSignIn, refresh } = useSession();
  // Fetch the popup chunk once the page is up, so the first Sign In tap doesn't wait on it.
  useEffect(() => {
    void loadAuthPopup();
  }, []);
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
