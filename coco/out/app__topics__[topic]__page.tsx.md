# app/topics/[topic]/page.tsx
lines:73 exports:metadata,default
---
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import SearchResultList from '@/components/discovery/SearchResultList';
import { getTopicQuestions } from '@/lib/actions/discovery-actions';

// Player-typed topic names become public URLs, so keep these out of search
// engines until that's decided (see docs/specs/discovery.md Open Questions).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { topic: encodedTopic } = await params;
  const topic = decodeURIComponent(encodedTopic);
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const { results, hasMore } = await getTopicQuestions(topic, page);

  return (
    <main className="min-h-screen bg-deep-space text-slate-100 flex flex-col">
      <Header />
      <div className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-black font-heading truncate">{topic}</h1>
          {results.length > 0 && (
            <Link
              href={`/q/${results[0].id}`}
              className="shrink-0 px-4 py-2 bg-linear-to-r from-neo-mint to-electric-indigo text-deep-space rounded-xl font-black font-heading text-xs whitespace-nowrap"
            >
              Play this topic
            </Link>
          )}
        </div>
