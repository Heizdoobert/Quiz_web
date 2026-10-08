'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { getSessionInfo } from '@/lib/actions/auth-actions';
import { logger } from '@/lib/logger';

const AuthPopup = dynamic(() => import('@/components/auth/AuthPopup'), {
  ssr: false,
});

export interface SessionAccount {
  id: string;
  wallet: string | null;
}

interface SessionContextValue {
  account: SessionAccount | null;
  refresh: () => Promise<SessionAccount | null>;
  // Resolves true once signed in. If already signed in, resolves immediately;
  // otherwise opens SignInModal and resolves when it closes (true on success,
  // false if the player cancels).
  requireSignIn: () => Promise<boolean>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<SessionAccount | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const resolversRef = useRef<Array<(ok: boolean) => void>>([]);
  const reqIdRef = useRef(0);

  const clearSession = useCallback(() => {
    reqIdRef.current += 1;
    setAccount(null);
    setModalOpen(false);
    if (resolversRef.current.length > 0) {
      const pending = resolversRef.current;
      resolversRef.current = [];
      pending.forEach((res) => res(false));
    }
  }, []);

  // Sign-in happens elsewhere (today: RainbowKit's auto SIWE flow calling refresh()
  // after Providers.tsx sees the auth status change); when that refresh finds an
  // account while a requireSignIn() call is waiting on the modal, settle it here.
  const refresh = useCallback(async () => {
    const currentReqId = ++reqIdRef.current;
    try {
      const info = await getSessionInfo();
      if (currentReqId !== reqIdRef.current) {
        return null;
      }
      setAccount(info);
      if (info && resolversRef.current.length > 0) {
        setModalOpen(false);
        const pending = resolversRef.current;
        resolversRef.current = [];
        pending.forEach((res) => res(true));
      }
      return info;
    } catch (err) {
      logger.error('session_refresh_failed', err);
      return null;
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const requireSignIn = useCallback(async () => {
    const info = await refresh();
    if (info) return true;
    return new Promise<boolean>((resolve) => {
      resolversRef.current.push(resolve);
      setModalOpen(true);
    });
  }, [refresh]);

  const cancelSignIn = useCallback(() => {
    setModalOpen(false);
    const pending = resolversRef.current;
    resolversRef.current = [];
    pending.forEach((res) => res(false));
  }, []);

  return (
    <SessionContext.Provider value={{ account, refresh, requireSignIn, clearSession }}>
      {children}
      <AuthPopup isOpen={modalOpen} onClose={cancelSignIn} refresh={refresh} />
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
