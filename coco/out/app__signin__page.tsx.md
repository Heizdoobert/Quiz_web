# app/signin/page.tsx
lines:27 exports:metadata,default
---
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import SignInContainer from '@/components/auth/SignInContainer';

export const metadata: Metadata = {
  title: 'Sign In | Quick Quiz',
  description: 'Sign in to Quick Quiz to save your progress, challenge players, and track leaderboard ranks.',
};

export default async function SignInPage(props: {
  searchParams?: Promise<{ redirect?: string }>;
}) {
  const searchParams = await props.searchParams;
  const initialRedirect = searchParams?.redirect;

  return (
    <div className="min-h-screen bg-deep-space text-slate-100 flex flex-col selection:bg-neo-mint selection:text-deep-space">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<div className="w-full max-w-md h-96 bg-slate-900/60 rounded-2xl animate-pulse" />}>
          <SignInContainer initialRedirect={initialRedirect} />
        </Suspense>
      </main>
    </div>
  );
}
