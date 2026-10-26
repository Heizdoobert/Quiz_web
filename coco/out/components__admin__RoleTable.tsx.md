# components/admin/RoleTable.tsx
lines:62 exports:default
---
'use client';

import { useState, useTransition } from 'react';
import { listAccountsAction } from '@/lib/actions/admin';
import type { AccountRow } from '@/lib/db/roles';
import RoleRow from './RoleRow';

const PAGE_SIZE = 20;

// Search by display name (there is no email on the users table) and page through the matches.
export default function RoleTable({ initial, selfId }: { initial: AccountRow[]; selfId: string }) {
  const [accounts, setAccounts] = useState(initial);
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(initial.length === PAGE_SIZE);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function load(term: string, offset: number) {
    startTransition(async () => {
      const res = await listAccountsAction(term, offset);
      if (!res.success) return setError(res.error.message);
      setError('');
      setAccounts((prev) => (offset === 0 ? res.data.accounts : [...prev, ...res.data.accounts]));
      setHasMore(res.data.accounts.length === res.data.limit);
    });
  }

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          load(search, 0);
        }}
        className="flex gap-2 mb-4"
      >
        <label htmlFor="account-search" className="sr-only">Search by display name</label>
        <input
          id="account-search"
