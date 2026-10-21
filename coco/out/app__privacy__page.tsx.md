# app/privacy/page.tsx
lines:73 exports:metadata,default
---
import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { LEGAL_LINK as LINK, type LegalSection } from '@/components/layout/LegalPage';
import { LEGAL_CONTACT_EMAIL, assertLegalFilled } from '@/lib/legal';

assertLegalFilled();

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Quick Quiz collects, why, who else sees it, and how to export or delete your data.',
};

const SECTIONS: LegalSection[] = [
  {
    title: 'Data we collect',
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>Account: your email address and display name. If you sign in with Google, your Google identity. Passwords are handled by our authentication provider, not by this site.</li>
        <li>Play data: your answers, scores and leaderboard position, the questions you write, the ratings, comments and disputes you submit on questions, and the groups you create or join.</li>
        <li>Error reports and usage events, only when error tracking or analytics is switched on for the site or app build you use.</li>
      </ul>
    ),
  },
  {
    title: 'Why we use it',
    body: <p>To sign you in, keep your progress, rank you on leaderboards, check questions for abuse, and find and fix errors. We do not sell your data.</p>,
  },
  {
    title: 'Cookies',
    body: <p>One cookie, <code>quiz_session</code>, keeps you signed in on the website for up to 7 days. If analytics is switched on, PostHog may also store its own identifier in your browser.</p>,
  },
  {
    title: 'Who else receives data',
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>Supabase stores the database and handles sign-in, including the emailed codes for sign-in and password reset.</li>
        <li>Vercel hosts the website.</li>
        <li>Google, if you choose Sign in with Google.</li>
        <li>Google Gemini receives the text of each question you submit, with its answer options, so it can be checked for abuse.</li>
        <li>Sentry receives error reports, and PostHog receives usage events, when they are configured for the build you use.</li>
