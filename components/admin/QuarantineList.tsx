'use client';

import { useState, useTransition } from 'react';
import { listQuarantineAction } from '@/lib/actions/admin-actions';
import type { QuarantinedQuestion } from '@/lib/db/questions';
import QuarantineItem from './QuarantineItem';

const PAGE_SIZE = 20;

export default function QuarantineList({ initial }: { initial: QuarantinedQuestion[] }) {
  const [questions, setQuestions] = useState(initial);
  const [hasMore, setHasMore] = useState(initial.length === PAGE_SIZE);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  function loadMore() {
    // Resolved questions leave the queue, so what is already loaded is exactly the offset.
    startTransition(async () => {
      const res = await listQuarantineAction(questions.length);
      if (!res.success) return setMessage(res.error.message);
      setQuestions((prev) => [...prev, ...res.data.questions]);
      setHasMore(res.data.questions.length === res.data.limit);
    });
  }

  return (
    <div>
      <p role="status" className="text-sm text-slate-300 mb-2">{message}</p>
      {questions.length === 0 ? (
        <p className="text-slate-300">Nothing awaiting moderation.</p>
      ) : (
        <ul>
          {questions.map((q) => (
            <QuarantineItem
              key={q.id}
              question={q}
              onDone={(id, text) => {
                setQuestions((prev) => prev.filter((item) => item.id !== id));
                setMessage(text);
              }}
            />
          ))}
        </ul>
      )}
      {hasMore && (
        <button type="button" disabled={pending} onClick={loadMore} className="mt-4 underline text-neo-mint">Load more</button>
      )}
    </div>
  );
}
