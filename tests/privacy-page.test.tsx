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
    expect(text()).not.toMatch(/SendGrid/);
  });

  it('names the session cookie', () => {
    expect(text()).toContain('quiz_session');
  });

  it('says deletion removes owned questions and groups', () => {
    const t = text();
    expect(t).toMatch(/questions you wrote/i);
    expect(t).toMatch(/groups you own/i);
  });

  it('says it stores ratings, comments and disputes, and deletes them', () => {
    const t = text();
    expect(t).toMatch(/ratings, comments and disputes you submit on questions/i);
    expect(t).toMatch(/ratings, comments and disputes you submitted/i);
  });

  it('links to the deletion page and no longer says the mobile app is the only way', () => {
    render(<PrivacyPage />);
    expect(screen.getByRole('link', { name: /account deletion/i }).getAttribute('href')).toBe('/account-deletion');
    expect(screen.queryByText(/operates Quick Quiz/)).toBeNull();
  });

  it('shows a contact mailto link', () => {
    render(<PrivacyPage />);
    const link = screen.getByRole('link', { name: LEGAL_CONTACT_EMAIL });
    expect(link.getAttribute('href')).toBe(`mailto:${LEGAL_CONTACT_EMAIL}`);
  });
});

describe('sitemap', () => {
  it('lists /privacy', () => {
    expect(sitemap().some((e) => e.url.endsWith('/privacy'))).toBe(true);
  });
});

describe('legal values', () => {
  it('are filled in, so a production build passes', () => {
    expect(() => assertLegalFilled({ VERCEL_ENV: 'production' })).not.toThrow();
    expect(LEGAL_OPERATOR).toBe('Quick Quiz');
  });
});

describe('assertLegalFilled', () => {
  const placeholder = { operator: 'TODO operator', email: 'TODO@example.invalid' };
  const filled = { operator: 'Acme Ltd', email: 'privacy@acme.test' };

  it('throws on production while the contact is a placeholder', () => {
    expect(() => assertLegalFilled({ VERCEL_ENV: 'production' }, placeholder)).toThrow(/legal/i);
  });

  it('passes on production once filled in', () => {
    expect(() => assertLegalFilled({ VERCEL_ENV: 'production' }, filled)).not.toThrow();
  });

  it('passes on preview and local with a placeholder', () => {
    expect(() => assertLegalFilled({ VERCEL_ENV: 'preview' }, placeholder)).not.toThrow();
    expect(() => assertLegalFilled({}, placeholder)).not.toThrow();
  });
});
