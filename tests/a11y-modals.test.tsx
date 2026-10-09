import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import TimerSettingsModal from '../components/modals/TimerSettingsModal';

describe('timer settings modal', () => {
  it('labels the mode and time-limit controls', () => {
    render(
      <TimerSettingsModal isOpen onClose={vi.fn()} currentMode="per-question" currentDuration={30} onSave={vi.fn()} />
    );
    expect(screen.getByLabelText('Timer Mode')).toBeTruthy();
    expect(screen.getByLabelText(/Time Limit/)).toBeTruthy();
  });
});
