import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';

export interface TopicItem {
  name: string;
  questionCount: number;
  latestAt: string;
}

export default function TopicList({ topics }: { topics: TopicItem[] }) {
  return (
    <ul className="w-full flex flex-col gap-3">
      {topics.map((topic) => (
        <li
          key={topic.name}
          className="glass glass-border glass-edge rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-[#00FFCC]/40 transition-colors"
        >
          <div className="min-w-0">
            <Link
              href={`/topics/${encodeURIComponent(topic.name)}`}
              className="text-sm sm:text-base text-slate-100 font-semibold hover:text-[#00FFCC] transition-colors truncate block font-heading"
            >
              {topic.name}
            </Link>
            <p className="text-xs text-slate-400 mt-1">
              {topic.questionCount} {topic.questionCount === 1 ? 'question' : 'questions'} · latest{' '}
              {formatRelativeTime(topic.latestAt)}
            </p>
          </div>
          <Link
            href={`/topics/${encodeURIComponent(topic.name)}`}
            className="shrink-0 px-4 py-2 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] text-[#0A1128] rounded-xl font-black font-heading text-xs whitespace-nowrap hover:opacity-95"
          >
            Browse
          </Link>
        </li>
      ))}
    </ul>
  );
}
