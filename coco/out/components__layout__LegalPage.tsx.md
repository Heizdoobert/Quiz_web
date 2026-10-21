# components/layout/LegalPage.tsx
lines:23 exports:LegalSection,LEGAL_LINK,default
---
import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';

export type LegalSection = { title: string; body: ReactNode };

export const LEGAL_LINK = 'text-neo-mint underline';

export default function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-deep-space text-slate-100 flex flex-col selection:bg-neo-mint selection:text-deep-space">
      <Header />
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        {sections.map(({ title: heading, body }) => (
          <section key={heading} className="space-y-2 text-slate-300">
            <h2 className="text-xl font-semibold text-slate-100">{heading}</h2>
            {body}
          </section>
        ))}
      </main>
    </div>
  );
}
