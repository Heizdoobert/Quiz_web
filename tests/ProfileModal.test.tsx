import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ProfileModal from '../components/modals/ProfileModal';



describe('ProfileModal', () => {
  it('renders the Creator Dashboard link', () => {
    const stats = { totalAnswered: 0, score: 0 };
    render(<ProfileModal isOpen={true} onClose={() => {}} address="0x123" claimableRewards={{}} stats={stats} />);
    
    expect(screen.getByText('Creator Dashboard & Backups')).toBeDefined();
  });
});
