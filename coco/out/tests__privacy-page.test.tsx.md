# tests/privacy-page.test.tsx
lines:102 exports:
---
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PrivacyPage from '../app/privacy/page';
import sitemap from '../app/sitemap';
import { LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR, assertLegalFilled } from '../lib/legal';

vi.mock('../components/layout/Header', () => ({
  default: () => <div data-testid="header-mock" />,
}));

describe('Privacy page', () => {
  const text = () => {
    const { container } = render(<PrivacyPage />);
    return container.textContent ?? '';
  };

  it('has the policy headings in order', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeTruthy();
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2).toEqual([
      'Data we collect',
      'Why we use it',
      'Cookies',
      'Who else receives data',
      'Retention',
      'Export and deletion',
      'Contact',
    ]);
  });

  it('lists every processor the code really calls', () => {
    const t = text();
    for (const name of ['Google', 'Supabase', 'Vercel', 'Gemini', 'Sentry', 'PostHog']) {
      expect(t).toContain(name);
    }
  });

  it('does not claim SendGrid mails sign-in codes (it only mails the admin report)', () => {
