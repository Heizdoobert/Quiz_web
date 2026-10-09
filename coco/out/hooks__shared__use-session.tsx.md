# hooks/shared/use-session.tsx
lines:111 exports:SessionAccount,SessionProvider,useSession
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
