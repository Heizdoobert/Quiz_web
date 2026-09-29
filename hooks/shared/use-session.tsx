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
import { getSessionInfo } from '@/lib/actions/auth-actions';
import SignInModal from '@/components/auth/SignInModal';

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
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<SessionAccount | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  // Sign-in happens elsewhere (today: RainbowKit's auto SIWE flow calling refresh()
  // after Providers.tsx sees the auth status change); when that refresh finds an
  // account while a requireSignIn() call is waiting on the modal, settle it here.
  const refresh = useCallback(async () => {
    const info = await getSessionInfo();
    setAccount(info);
    if (info && resolveRef.current) {
      setModalOpen(false);
      resolveRef.current(true);
      resolveRef.current = null;
    }
    return info;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const requireSignIn = useCallback(async () => {
    const info = await refresh();
    if (info) return true;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setModalOpen(true);
    });
  }, [refresh]);

  const cancelSignIn = useCallback(() => {
    setModalOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  return (
    <SessionContext.Provider value={{ account, refresh, requireSignIn }}>
      {children}
      <SignInModal isOpen={modalOpen} onClose={cancelSignIn} refresh={refresh} />
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
