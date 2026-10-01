# app/my-lists/page.tsx
lines:11 exports:default
---
import ListsNav from '@/components/lists/ListsNav';
import MyListsDashboard from '@/components/lists/MyListsDashboard';

export default function MyListsPage() {
  return (
    <main className="min-h-screen bg-[#0A1128] text-slate-100 flex flex-col">
      <ListsNav />
      <MyListsDashboard />
    </main>
  );
}
