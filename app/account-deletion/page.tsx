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
        <li>Groups you own, with their members and leaderboards.</li>
      </ul>
    ),
  },
  {
    title: 'What is kept',
    body: (
      <p>
        Error reports and usage events already sent to Sentry or PostHog are not erased by deleting your account. Ask us below if you want
        them removed. Other players&apos; accounts, scores and stats are kept; only their answers to questions you wrote are deleted.
      </p>
    ),
  },
  {
    title: 'Cannot sign in?',
    body: (
      <p>
        Write to{' '}
        <a className={LEGAL_LINK} href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
          {LEGAL_CONTACT_EMAIL}
        </a>{' '}
        from the email address on the account. See the <Link className={LEGAL_LINK} href="/privacy">privacy policy</Link> for what we collect.
      </p>
    ),
  },
];

export default function AccountDeletionPage() {
  return <LegalPage title="Delete Your Account" sections={SECTIONS} />;
}
