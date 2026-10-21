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
      logger.error('delete_account_failed', err);
      setError('Could not delete your account. Try again.');
    }
    setBusy(false);
  };

  return (
    <section aria-labelledby="danger-zone-heading" className="mt-12 pt-6 border-t border-pop-coral/30">
      <h2 id="danger-zone-heading" className="text-sm font-heading font-bold uppercase tracking-wider text-pop-coral">
        Delete account
      </h2>
      <p className="text-slate-400 text-sm mt-2 max-w-md leading-relaxed">
        Permanently remove your account and everything tied to it. Back up your data first if you want a copy.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-xs border border-pop-coral/50 text-pop-coral hover:bg-pop-coral/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pop-coral"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
        Delete account
      </button>

      <Modal
        isOpen={open}
        onClose={close}
        title="Delete your account?"
        icon={<Trash2 className="w-5 h-5 text-pop-coral" />}
        footer={
          <>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="px-4 py-2 rounded-xl text-xs font-heading font-bold text-slate-300 hover:text-white cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={busy || typed !== CONFIRM_WORD}
              aria-busy={busy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-bold bg-pop-coral text-deep-space cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pop-coral"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Delete my account
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-300 leading-relaxed">This cannot be undone. It removes:</p>
        <ul className="list-disc pl-5 mt-2 text-sm text-slate-300 space-y-1">
          <li>your sign-in (email and password) and profile</li>
          <li>your answers, scores and stats</li>
          <li>the questions you wrote, and the ratings, comments and answers other players left on them</li>
          <li>groups you own, with their members and leaderboards</li>
        </ul>
        <label htmlFor="delete-confirm" className="block mt-5 text-xs font-heading font-bold text-slate-300">
          Type {CONFIRM_WORD} to confirm
        </label>
        <input
          id="delete-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="mt-2 w-full rounded-xl bg-deep-space border border-cyber-border px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pop-coral"
        />
        {error && (
          <div role="alert" className="mt-4 flex items-center gap-2 text-sm text-pop-coral">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </Modal>
    </section>
  );
}
