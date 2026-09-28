'use client';

import { useState, useEffect, useCallback } from 'react';
import { Group } from '@/lib/types';
import { createGroup, joinGroup, leaveGroup, getUserGroups } from '@/lib/actions/group-actions';
import { useWalletSession } from '@/hooks/shared/use-wallet-session';

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
  const ensureSession = useWalletSession();

  const loadGroups = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    const list = await getUserGroups(walletAddress);
    setGroups(list);
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    if (isOpen && walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadGroups();
    }
  }, [isOpen, walletAddress, loadGroups]);

  const selectTab = (t: 'my' | 'create' | 'join') => {
    setTab(t);
    setMessage(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setMessage({ type: 'error', text: 'Please connect your wallet first.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    if (!(await ensureSession())) {
      setLoading(false);
      setMessage(SIGN_IN_ERROR);
      return;
    }
    const res = await createGroup({ name: groupName, description: groupDesc });
    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to create group' });
    } else {
      setMessage({ type: 'success', text: `Group "${res.group?.name}" created!` });
      setGroupName('');
      setGroupDesc('');
      loadGroups();
      setTab('my');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setMessage({ type: 'error', text: 'Please connect your wallet first.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    if (!(await ensureSession())) {
      setLoading(false);
      setMessage(SIGN_IN_ERROR);
      return;
    }
    const res = await joinGroup(joinId.trim());
    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to join group' });
    } else {
      setMessage({ type: 'success', text: 'Successfully joined group!' });
      setJoinId('');
      loadGroups();
      setTab('my');
    }
  };

  const handleLeave = async (groupId: string) => {
    if (!walletAddress) return;
    if (!(await ensureSession())) {
      setMessage(SIGN_IN_ERROR);
      return;
    }
    const res = await leaveGroup(groupId);
    if (!res.success) setMessage({ type: 'error', text: res.error || 'Failed to leave group' });
    loadGroups();
  };

  const handleSelectGroup = (groupId: string) => {
    onSelectGroup?.(groupId);
    onClose();
  };

  return {
    tab,
    selectTab,
    groups,
    loading,
    message,
    groupName,
    setGroupName,
    groupDesc,
    setGroupDesc,
    joinId,
    setJoinId,
    handleCreate,
    handleJoin,
    handleLeave,
    handleSelectGroup,
  };
}
