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
          value={search}
          maxLength={50}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Display name"
          className="flex-1 bg-cyber-violet text-white rounded px-3 py-2"
        />
        <button type="submit" disabled={pending} className="px-4 py-2 rounded border border-cyber-border text-white">Search</button>
      </form>
      {error && <p role="alert" className="text-pop-coral mb-2">{error}</p>}
      {accounts.length === 0 ? (
        <p role="status" className="text-slate-300">No accounts match.</p>
      ) : (
        <ul>{accounts.map((a) => <RoleRow key={a.id} account={a} isSelf={a.id.toLowerCase() === selfId.toLowerCase()} />)}</ul>
      )}
      {hasMore && (
        <button type="button" disabled={pending} onClick={() => load(search, accounts.length)} className="mt-4 underline text-neo-mint">
          Load more
        </button>
      )}
    </div>
  );
}
