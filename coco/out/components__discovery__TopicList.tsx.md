# components/discovery/TopicList.tsx
lines:31 exports:default
---
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';

interface Topic {
  name: string;
  questionCount: number;
  latestAt: string;
}

export default function TopicList({ topics }: { topics: Topic[] }) {
  return (
    <ul className="w-full flex flex-col gap-3">
      {topics.map((topic) => (
        <li key={topic.name}>
          <Link
            href={`/topics/${encodeURIComponent(topic.name)}`}
            className="glass glass-border glass-edge rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-neo-mint/60 transition-all"
          >
            <div className="min-w-0">
              <p className="text-sm sm:text-base text-slate-100 font-semibold truncate">{topic.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {topic.questionCount} question{topic.questionCount === 1 ? '' : 's'} · last added{' '}
                {formatRelativeTime(topic.latestAt)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
