import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

// code is the error code from authorize(): a guest is told to sign in, anyone else is told no.
export default function AdminDenied({ code }: { code?: string }) {
  const signedOut = code === 'UNAUTHORIZED';
  return (
    <div role="alert" className="max-w-lg mx-auto my-16 px-6 py-12 text-center border border-cyber-border rounded-2xl bg-cyber-violet/60">
      <ShieldAlert className="w-10 h-10 mx-auto mb-4 text-pop-coral" aria-hidden="true" />
      <h1 className="text-2xl font-black font-heading text-white mb-2">{signedOut ? 'Sign in required' : 'No access'}</h1>
      <p className="text-slate-300 text-sm mb-6">
        {signedOut
          ? 'Sign in from the quiz home page, then open this page again.'
          : 'Your account does not have permission to open this page.'}
      </p>
      <Link href="/" className="text-neo-mint underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint">
        Back to the quiz
      </Link>
    </div>
  );
}
