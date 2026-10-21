# app/account-deletion/page.tsx
lines:70 exports:metadata,default
---
import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { LEGAL_LINK, type LegalSection } from '@/components/layout/LegalPage';
import { LEGAL_CONTACT_EMAIL, assertLegalFilled } from '@/lib/legal';

assertLegalFilled();

export const metadata: Metadata = {
  title: 'Delete Your Account',
  description: 'How to delete your Quick Quiz account and data from the website or the mobile app, and what is kept.',
};

const SECTIONS: LegalSection[] = [
  {
    title: 'On the website',
    body: (
      <ol className="list-decimal pl-6 space-y-1">
        <li>Sign in and open your <Link className={LEGAL_LINK} href="/profile">profile</Link>.</li>
        <li>Scroll to the bottom and choose Delete account.</li>
        <li>Type DELETE to confirm. Deletion starts at once and cannot be undone.</li>
      </ol>
    ),
  },
  {
    title: 'In the mobile app',
    body: (
      <ol className="list-decimal pl-6 space-y-1">
        <li>Sign in and open Profile.</li>
        <li>Scroll to the bottom and choose Delete account.</li>
        <li>Confirm. The app signs you out and clears what it stored on your phone.</li>
      </ol>
    ),
  },
  {
    title: 'What is deleted',
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>Your account, sign-in identity, display name and email address.</li>
        <li>Your answers, scores and stats, and the ratings, comments and disputes you submitted.</li>
        <li>The questions you wrote, with the ratings, comments and answers other players left on them.</li>
