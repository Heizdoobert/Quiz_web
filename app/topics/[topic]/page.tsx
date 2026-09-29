import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import SearchResultList from '@/components/discovery/SearchResultList';
import { getTopicQuestions } from '@/lib/actions/discovery-actions';
import { Play } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic: rawTopic } = await params;
  const topic = decodeURIComponent(rawTopic);
  return {
    title: `${topic} Questions`,
    description: `Browse and play trivia questions about ${topic}.`,
  };
}

export default async function TopicQuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { topic: rawTopic } = await params;
  const topic = decodeURIComponent(rawTopic);
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);

  const { results, hasMore } = await getTopicQuestions(topic, page);

  return (
    <main className="min-h-screen bg-[#0A1128] text-slate-100 flex flex-col">
      <Header />
      <div className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/topics" className="text-xs text-slate-400 hover:text-white">
            ← All Topics
          </Link>
          <Link
            href={`/?category=${encodeURIComponent(topic)}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] rounded-xl font-black font-heading text-xs whitespace-nowrap shadow-lg shadow-[#00FFCC]/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Play this topic
          </Link>
        </div>

        <h1 className="text-xl font-black font-heading truncate">{topic}</h1>

        {results.length === 0 ? (
          <p className="text-sm text-slate-400">
            No questions in this topic yet.{' '}
            <Link href="/topics" className="text-[#00FFCC] underline">
              Browse other topics
            </Link>
            .
          </p>
        ) : (
          <SearchResultList results={results} />
        )}

        {(page > 1 || hasMore) && (
          <div className="flex justify-between pt-2 text-xs">
            {page > 1 ? (
              <Link
                href={`/topics/${encodeURIComponent(topic)}?page=${page - 1}`}
                className="text-slate-400 hover:text-white"
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            {hasMore && (
              <Link
                href={`/topics/${encodeURIComponent(topic)}?page=${page + 1}`}
                className="text-slate-400 hover:text-white"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
