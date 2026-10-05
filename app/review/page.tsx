import ListsNav from '@/components/lists/ListsNav';
import ReviewQueue from '@/components/lists/ReviewQueue';

export default function ReviewPage() {
  return (
    <main className="min-h-screen bg-deep-space text-slate-100 flex flex-col">
      <ListsNav />
      <ReviewQueue />
    </main>
  );
}
