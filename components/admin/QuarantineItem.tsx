'use client';

import { useState, useTransition } from 'react';
import { resolveQuarantineAction } from '@/lib/actions/admin-actions';
import type { QuarantinedQuestion } from '@/lib/db/questions';
import { MAX_NOTE_LENGTH } from '@/lib/constants/moderation';

type Props = { question: QuarantinedQuestion; onDone: (id: string, message: string) => void };

// One quarantined question with its answer key and open disputes. Restore puts it back in play,
// retire rejects it; either way it leaves the queue.
export default function QuarantineItem({ question, onDone }: Props) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const options = Array.isArray(question.options) ? question.options.map(String) : [];

  function resolve(outcome: 'restore' | 'retire') {
    startTransition(async () => {
      const res = await resolveQuarantineAction(question.id, outcome, note);
      if (res.success) return onDone(question.id, `Question ${res.data.outcome}.`);
      // Another moderator got there first: it is not in the queue any more.
      if (res.error.code === 'CONFLICT' || res.error.code === 'NOT_FOUND') return onDone(question.id, res.error.message);
      setError(res.error.message);
    });
  }

  return (
    <li className="py-4 border-b border-cyber-border">
      <h2 className="text-lg text-white mb-2">{question.prompt}</h2>
      <ol className="list-decimal pl-6 text-slate-200 mb-2">
        {options.map((option, i) => (
          <li key={i}>
            {option}
            {i === question.correct_index && <strong className="ml-2 text-neo-mint">(correct)</strong>}
          </li>
        ))}
      </ol>
      {question.explanation && <p className="text-sm text-slate-300 mb-2">{question.explanation}</p>}
      <p className="text-sm text-slate-300">{question.dispute_count} disputes</p>
      <ul className="list-disc pl-6 text-sm text-slate-300 mb-3">
        {question.disputes.map((d) => <li key={d.id}>{d.reason}</li>)}
      </ul>
      <label htmlFor={`note-${question.id}`} className="block text-sm text-slate-200">Note (optional)</label>
      <textarea
        id={`note-${question.id}`}
        value={note}
        maxLength={MAX_NOTE_LENGTH}
        onChange={(e) => setNote(e.target.value)}
        className="w-full bg-cyber-violet text-white rounded p-2 mb-1"
      />
      <p className="text-xs text-slate-400 mb-2">{note.length}/{MAX_NOTE_LENGTH}</p>
      <div className="flex gap-3">
        <button type="button" disabled={pending} onClick={() => resolve('restore')} className="px-3 py-1 rounded border border-neo-mint text-neo-mint">Restore</button>
        <button type="button" disabled={pending} onClick={() => resolve('retire')} className="px-3 py-1 rounded border border-pop-coral text-pop-coral">Retire</button>
      </div>
      {error && <p role="alert" className="mt-2 text-pop-coral">{error}</p>}
    </li>
  );
}
