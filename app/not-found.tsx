import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl space-y-4">
        <div className="text-5xl">🧭</div>
        <h2 className="text-2xl font-bold text-white">404 - Page Not Found</h2>
        <p className="text-xs text-slate-400">
          The page or quiz you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg"
          >
            ← Back to Quick Quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
