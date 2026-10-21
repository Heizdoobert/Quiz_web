# components/admin/ConfigToggle.tsx
lines:51 exports:default
---
'use client';

import { useState, useTransition } from 'react';
import { updateConfigAction } from '@/lib/actions/admin-actions';

// A boolean config key as a switch. Turning it either way asks first: a flip reaches every client.
export default function ConfigToggle({ name, initial }: { name: string; initial: boolean }) {
  const [value, setValue] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  function save() {
    const next = !value;
    startTransition(async () => {
      const res = await updateConfigAction(name, next);
      if (res.success) {
        setValue(next);
        setMessage(`${name} is now ${next ? 'on' : 'off'}. Clients see it within about a minute.`);
      } else {
        setMessage(res.error.message);
      }
      setConfirming(false);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4 py-3">
      <span className="font-mono text-slate-100">{name}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={name}
        disabled={pending}
        onClick={() => setConfirming(true)}
        className="px-3 py-1 rounded-lg border border-cyber-border text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
      >
        {value ? 'On' : 'Off'}
      </button>
