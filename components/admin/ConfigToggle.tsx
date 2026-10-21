'use client';

import { useState, useTransition } from 'react';
import { updateConfigAction } from '@/lib/actions/admin';

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
      {confirming && (
        <span className="flex items-center gap-2 text-sm text-slate-200">
          Turn {name} {value ? 'off' : 'on'}?
          <button type="button" disabled={pending} onClick={save} className="underline text-neo-mint">Confirm</button>
          <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="underline">Cancel</button>
        </span>
      )}
      <p role="status" className="basis-full text-sm text-slate-300">{message}</p>
    </div>
  );
}
