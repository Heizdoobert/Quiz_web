# hooks/shared/use-session.tsx
lines:110 exports:SessionAccount,SessionProvider,useSession
---
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
  wallet: string | null;
}

interface SessionContextValue {
  account: SessionAccount | null;
  refresh: () => Promise<SessionAccount | null>;
  // Resolves true once signed in. If already signed in, resolves immediately;
  // otherwise opens the sign-in popup and resolves when it closes (true on success,
  // false if the player cancels). The popup lives in WalletProviders, so only
  // routes under it may call this.
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

