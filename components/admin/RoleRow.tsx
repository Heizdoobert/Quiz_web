'use client';

import { useState, useTransition } from 'react';
import { setRoleAction } from '@/lib/actions/admin-actions';
import type { AccountRow } from '@/lib/db/roles';
import { ROLES } from '@/lib/services/rbac';

// One account. Picking a role asks first; your own row is fixed, the service refuses it anyway.
export default function RoleRow({ account, isSelf }: { account: AccountRow; isSelf: boolean }) {
  const [role, setRole] = useState(account.role);
  const [picked, setPicked] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const label = `${account.display_name ?? '(no name)'} (${account.id.slice(0, 8)})`;

  function save(next: string) {
    startTransition(async () => {
      const res = await setRoleAction(account.id, next);
      if (res.success) setRole(next);
      setMessage(res.success ? `${label} is now ${next}.` : res.error.message);
      setPicked(null);
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-2 border-b border-cyber-border">
      <span className="flex-1 min-w-48 text-slate-100">{label}</span>
      <select
        aria-label={`Role of ${label}`}
        value={picked ?? role}
        disabled={isSelf || pending}
        title={isSelf ? 'You cannot change your own role.' : undefined}
        onChange={(e) => setPicked(e.target.value === role ? null : e.target.value)}
        className="bg-cyber-violet text-white rounded px-2 py-1"
      >
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      {picked && (
        <span className="flex items-center gap-2 text-sm text-slate-200">
          Change to {picked}?
          <button type="button" disabled={pending} onClick={() => save(picked)} className="underline text-neo-mint">Confirm</button>
          <button type="button" disabled={pending} onClick={() => setPicked(null)} className="underline">Cancel</button>
        </span>
      )}
      <span role="status" className="basis-full text-sm text-slate-300">{message}</span>
    </li>
  );
}
