# app/contest/page.tsx
lines:11 exports:default
---
import ListsNav from '@/components/lists/ListsNav';
import ContestBrowser from '@/components/lists/ContestBrowser';

export default function ContestPage() {
  return (
    <main className="min-h-screen bg-deep-space text-slate-100 flex flex-col">
      <ListsNav />
      <ContestBrowser />
    </main>
  );
}
