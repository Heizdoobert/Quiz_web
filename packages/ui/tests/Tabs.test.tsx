import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from '../src/components/Tabs';

describe('Tabs Primitive (TDD)', () => {
  const sampleItems = [
    { key: 'overview', label: 'Overview', content: <div>Overview Content</div> },
    { key: 'questions', label: 'Questions', content: <div>Questions Content</div> },
    { key: 'settings', label: 'Settings', content: <div>Settings Content</div>, disabled: true },
  ];

  it('renders tablist, tabs, and default active tabpanel', () => {
    render(<Tabs items={sampleItems} />);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeDefined();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(3);

    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel')).toBeDefined();
    expect(screen.getByText('Overview Content')).toBeDefined();
  });

  it('switches active tab and panel on click and calls onChange', () => {
    const handleChange = vi.fn();
    render(<Tabs items={sampleItems} onChange={handleChange} />);

    const questionsTab = screen.getByRole('tab', { name: 'Questions' });
    fireEvent.click(questionsTab);

    expect(handleChange).toHaveBeenCalledWith('questions');
    expect(questionsTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Questions Content')).toBeDefined();
    expect(screen.queryByText('Overview Content')).toBeNull();
  });

  it('does not select disabled tab when clicked', () => {
    const handleChange = vi.fn();
    render(<Tabs items={sampleItems} onChange={handleChange} />);

    const settingsTab = screen.getByRole('tab', { name: 'Settings' });
    expect(settingsTab.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(settingsTab);
    expect(handleChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Settings Content')).toBeNull();
  });

  it('supports controlled activeKey', () => {
    const { rerender } = render(<Tabs items={sampleItems} activeKey="questions" />);
    expect(screen.getByText('Questions Content')).toBeDefined();

    rerender(<Tabs items={sampleItems} activeKey="overview" />);
    expect(screen.getByText('Overview Content')).toBeDefined();
  });

  it('supports keyboard navigation with ArrowRight and ArrowLeft', () => {
    const handleChange = vi.fn();
    render(<Tabs items={sampleItems} onChange={handleChange} />);

    const firstTab = screen.getAllByRole('tab')[0];
    firstTab.focus();

    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith('questions');
    expect(screen.getByText('Questions Content')).toBeDefined();
  });
});
