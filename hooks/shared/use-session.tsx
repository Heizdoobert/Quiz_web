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
import { logger } from '@/lib/logger';

export interface SessionAccount {
  id: string;
}

interface SessionContextValue {
  account: SessionAccount | null;
  refresh: () => Promise<SessionAccount | null>;
  // Resolves true once signed in. If already signed in, resolves immediately;
  // otherwise opens the sign-in popup and resolves when it closes (true on success,
  // false if the player cancels).
  requireSignIn: () => Promise<boolean>;
  clearSession: () => void;
  modalOpen: boolean;
  cancelSignIn: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<SessionAccount | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const resolversRef = useRef<Array<(ok: boolean) => void>>([]);
  const reqIdRef = useRef(0);
  // True once a check has found no session, so the popup can open before the next check answers.
  const signedOutRef = useRef(false);

  const clearSession = useCallback(() => {
    reqIdRef.current += 1;
    signedOutRef.current = true;
    setAccount(null);
    setModalOpen(false);
    if (resolversRef.current.length > 0) {
      const pending = resolversRef.current;
      resolversRef.current = [];
      pending.forEach((res) => res(false));
    }
  }, []);

  // Sign-in happens in the popup, which calls refresh() when it succeeds; when that
  // refresh finds an account while a requireSignIn() call is waiting on the modal,
  // settle it here.
  const refresh = useCallback(async () => {
    const currentReqId = ++reqIdRef.current;
    try {
      const info = await getSessionInfo();
      if (currentReqId !== reqIdRef.current) {
        return null;
      }
      signedOutRef.current = info === null;
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
    const openPopup = () =>
      new Promise<boolean>((resolve) => {
        resolversRef.current.push(resolve);
        setModalOpen(true);
      });
    if (signedOutRef.current) {
      // The popup opens now instead of after a server round trip; if a session shows up
      // meanwhile (another tab), refresh() closes the popup and settles this call.
      const signedIn = openPopup();
      void refresh();
      return signedIn;
    }
    return (await refresh()) ? true : openPopup();
  }, [refresh]);

  const cancelSignIn = useCallback(() => {
    setModalOpen(false);
    const pending = resolversRef.current;
    resolversRef.current = [];
    pending.forEach((res) => res(false));
  }, []);

  return (
    <SessionContext.Provider
      value={{ account, refresh, requireSignIn, clearSession, modalOpen, cancelSignIn }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
