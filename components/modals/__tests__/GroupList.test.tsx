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
    expect(screen.getByText('The alpha testers')).toBeTruthy();

    const viewBtn = screen.getByText('View Board');
    fireEvent.click(viewBtn);
    expect(onSelect).toHaveBeenCalledWith('g1');

    const leaveBtn = screen.getByText('Leave');
    fireEvent.click(leaveBtn);
    expect(onLeave).toHaveBeenCalledWith('g1');
  });
});
