# app/not-found.tsx
lines:28 exports:default
---
import Link from 'next/link';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-deep-space text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 bg-cyber-violet border border-cyber-border rounded-3xl shadow-2xl shadow-black/60 space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-electric-indigo/20 rounded-2xl border border-electric-indigo/40 text-electric-indigo">
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
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-neo-mint to-electric-indigo hover:opacity-95 text-deep-space text-xs font-black rounded-xl transition-all shadow-lg shadow-neo-mint/20 font-heading"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quick Quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
