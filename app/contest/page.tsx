import ListsNav from '@/components/lists/ListsNav';
import ContestBrowser from '@/components/lists/ContestBrowser';

export default function ContestPage() {
  return (
    <main className="min-h-screen bg-[#0A1128] text-slate-100 flex flex-col">
      <ListsNav />
      <ContestBrowser />
    </main>
  );
}
