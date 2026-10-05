# components/lists/MyListsDashboard.tsx
lines:133 exports:default
---
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { createList, getMyLists } from '@/lib/actions/question-list-actions';
import { MIN_LIST_QUESTIONS, REQUIRED_CONFIRMATIONS } from '@/lib/constants/list-constants';
import { QuestionListWithMeta } from '@/lib/types';
import { useSession } from '@/hooks/shared/use-session';
import { ListCard } from './dashboard/ListCard';

const SIGN_IN_ERROR = 'Sign the message in your wallet to manage your lists.';

export default function MyListsDashboard() {
  const { account, requireSignIn: ensureSession } = useSession();

  const [lists, setLists] = useState<QuestionListWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setLists(await getMyLists());
    setLoading(false);
  }, [account]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setMessage(null);
    if (!(await ensureSession())) {
      setMessage({ type: 'error', text: SIGN_IN_ERROR });
