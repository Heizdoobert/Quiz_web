# components/modals/__tests__/GroupList.test.tsx
lines:51 exports:
---
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GroupList } from '../group/GroupList';
import { Group } from '@/lib/types';

describe('GroupList', () => {
  const mockGroups: Group[] = [
    {
      id: 'g1',
      name: 'Alpha Team',
      description: 'The alpha testers',
      owner_wallet: 'user1',
      created_at: '2026-01-01',
    },
  ];

  it('renders loading state', () => {
    render(<GroupList groups={[]} loading={true} onLeaveGroup={vi.fn()} />);
    expect(screen.getByText(/Loading groups/i)).toBeTruthy();
  });

  it('renders empty state', () => {
    render(<GroupList groups={[]} loading={false} onLeaveGroup={vi.fn()} />);
    expect(screen.getByText(/You haven't joined any groups yet/i)).toBeTruthy();
  });

  it('renders group list and handles clicks', () => {
    const onSelect = vi.fn();
    const onLeave = vi.fn();

    render(
      <GroupList
        groups={mockGroups}
        loading={false}
        onSelectGroup={onSelect}
        onLeaveGroup={onLeave}
      />
    );

    expect(screen.getByText('Alpha Team')).toBeTruthy();
