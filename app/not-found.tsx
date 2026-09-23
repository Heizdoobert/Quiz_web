import Link from 'next/link';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A1128] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 bg-[#1A1B35] border border-[#2D305A] rounded-3xl shadow-2xl shadow-black/60 space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-[#6C5CE7]/20 rounded-2xl border border-[#6C5CE7]/40 text-[#6C5CE7]">
            <Compass className="w-12 h-12" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-white font-heading">404 - Page Not Found</h2>
        <p className="text-xs text-slate-400">
          The page or quiz you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] text-xs font-black rounded-xl transition-all shadow-lg shadow-[#00FFCC]/20 font-heading"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quick Quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
