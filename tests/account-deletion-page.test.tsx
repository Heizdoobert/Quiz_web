import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AccountDeletionPage from '../app/account-deletion/page';
import sitemap from '../app/sitemap';
import { LEGAL_CONTACT_EMAIL } from '../lib/legal';

vi.mock('../components/layout/Header', () => ({
  default: () => <div data-testid="header-mock" />,
}));

describe('Account deletion page', () => {
  it('gives the web, mobile and email routes, and what is deleted and kept', () => {
    render(<AccountDeletionPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Delete Your Account' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'On the website',
      'In the mobile app',
      'What is deleted',
      'What is kept',
      'Cannot sign in?',
    ]);
  });

  it('says the written questions and owned groups go, and that Sentry and PostHog events stay', () => {
    const { container } = render(<AccountDeletionPage />);
    const t = container.textContent ?? '';
    expect(t).toMatch(/questions you wrote/i);
    expect(t).toMatch(/groups you own/i);
    expect(t).toMatch(/Sentry or PostHog/);
  });

  it('has a contact mailto link and a link back to the policy', () => {
    render(<AccountDeletionPage />);
    expect(screen.getByRole('link', { name: LEGAL_CONTACT_EMAIL }).getAttribute('href')).toBe(`mailto:${LEGAL_CONTACT_EMAIL}`);
    expect(screen.getByRole('link', { name: /privacy policy/i }).getAttribute('href')).toBe('/privacy');
  });

  it('is in the sitemap', () => {
    expect(sitemap().some((e) => e.url.endsWith('/account-deletion'))).toBe(true);
  });
});
