import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A1128] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 bg-[#1A1B35] border border-[#2D305A] rounded-3xl shadow-2xl shadow-black/60 space-y-4">
        <div className="text-5xl">🧭</div>
        <h2 className="text-2xl font-black text-white">404 - Page Not Found</h2>
        <p className="text-xs text-slate-400">
          The page or quiz you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] text-xs font-black rounded-xl transition-all shadow-lg shadow-[#00FFCC]/20"
          >
            ← Back to Quick Quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
