# app/topics/page.tsx
lines:27 exports:metadata,default
---
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import TopicList from '@/components/discovery/TopicList';
import { getTopics } from '@/lib/actions/question-actions';

export const metadata: Metadata = {
  title: 'Topics',
};

export default async function TopicsPage() {
  const topics = await getTopics();

  return (
    <main className="min-h-screen bg-[#0A1128] text-slate-100 flex flex-col">
      <Header />
      <div className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">
        <h1 className="text-xl font-black font-heading">Topics</h1>

        {topics.length === 0 ? (
          <p className="text-sm text-slate-400">No topics yet.</p>
        ) : (
          <TopicList topics={topics} />
        )}
      </div>
    </main>
  );
}
