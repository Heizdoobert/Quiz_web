import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SeoFaqSection from '../components/seo/SeoFaqSection';
import { FAQ_DATA } from '../lib/seo-data';

describe('SeoFaqSection accordion', () => {
  const tabFor = (question: string) => screen.getByText(question).closest('button')!;
  it('renders all questions collapsed', () => {
    render(<SeoFaqSection />);
    for (const faq of FAQ_DATA) {
      expect(screen.getByText(faq.question)).toBeTruthy();
      expect(screen.queryByText(faq.answer)).toBeNull();
    }
    expect(
      screen.getAllByRole('button', { expanded: false }).length
    ).toBe(FAQ_DATA.length);
  });

  it('opens the answer on click and closes on second click', async () => {
    render(<SeoFaqSection />);
    const first = FAQ_DATA[0];
    const tab = tabFor(first.question);

    fireEvent.click(tab);
    expect(tab.getAttribute('aria-expanded')).toBe('true');
    expect(await screen.findByText(first.answer)).toBeTruthy();

    fireEvent.click(tab);
    expect(tab.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps only one answer open at a time', async () => {
    render(<SeoFaqSection />);
    const [a, b] = FAQ_DATA;
    const tabA = tabFor(a.question);
    const tabB = tabFor(b.question);

    fireEvent.click(tabA);
    expect(await screen.findByText(a.answer)).toBeTruthy();
    fireEvent.click(tabB);
    expect(await screen.findByText(b.answer)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(a.answer)).toBeNull());
  });
});
