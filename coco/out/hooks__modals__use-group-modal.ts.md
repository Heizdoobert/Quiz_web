# hooks/modals/use-group-modal.ts
lines:132 exports:useGroupModal
---
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Group } from '@/lib/types';
import { createGroup, joinGroup, leaveGroup, getUserGroups } from '@/lib/actions/group-actions';
import { useSession } from '@/hooks/shared/use-session';

const SIGN_IN_ERROR = { type: 'error', text: 'Sign the message in your wallet to manage groups.' } as const;

interface UseGroupModalOptions {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
  onSelectGroup?: (groupId: string) => void;
}

export function useGroupModal({ isOpen, onClose, walletAddress, onSelectGroup }: UseGroupModalOptions) {
  const [tab, setTab] = useState<'my' | 'create' | 'join'>('my');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [joinId, setJoinId] = useState('');
  const { requireSignIn: ensureSession } = useSession();

  const loadGroups = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    const list = await getUserGroups();
    setGroups(list);
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    if (isOpen && walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadGroups();
    }
