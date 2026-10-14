# app/search/page.tsx
lines:66 exports:metadata,default
---
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import SearchResultList from '@/components/discovery/SearchResultList';
import { searchQuestions } from '@/lib/actions/discovery-actions';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = '', page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const { results, hasMore } = q ? await searchQuestions(q, page) : { results: [], hasMore: false };

  return (
    <main className="min-h-screen bg-deep-space text-slate-100 flex flex-col">
      <Header />
      <div className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
        <h1 className="text-xl font-black font-heading truncate">
          {q ? `Search results for "${q}"` : 'Search questions'}
        </h1>

        {q && results.length === 0 && (
          <p className="text-sm text-slate-400">
            No questions match &quot;{q}&quot;.{' '}
            <Link href="/topics" className="text-neo-mint underline">
              Browse topics
            </Link>{' '}
            instead.
          </p>
        )}

        {results.length > 0 && <SearchResultList results={results} />}

