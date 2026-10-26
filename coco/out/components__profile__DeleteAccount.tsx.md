# components/profile/DeleteAccount.tsx
lines:119 exports:default
---
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { deleteMyAccount } from '@/lib/actions/users';
import { useSession } from '@/hooks/shared/use-session';
import { logger } from '@/lib/logger';

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccount() {
  const router = useRouter();
  const { clearSession } = useSession();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped('');
    setError(null);
  };

  const confirm = async () => {
    if (busy || typed !== CONFIRM_WORD) return;
    setBusy(true);
    setError(null);
    try {
      const res = await deleteMyAccount();
      if (res.success) {
        clearSession();
        router.push('/');
        return;
      }
      setError(res.error);
    } catch (err) {
