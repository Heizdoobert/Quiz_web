import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
  Modal,
  tokens,
} from '@heizdoobert/quickquiz-ui';

describe('UI SDK Integration in Web App', () => {
  it('exposes design tokens to the application', () => {
    expect(tokens.colors.primary.DEFAULT).toContain('--color-primary');
    expect(tokens.radii.md).toContain('--radius-md');
  });

  it('renders a composed quiz card using UI SDK primitives', () => {
    render(
      <Card data-testid="trivia-card">
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <CardTitle>History Quiz</CardTitle>
            <Badge variant="success">Verified</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p>Who was the first president of the United States?</p>
          <Button variant="primary">Answer Now</Button>
        </CardContent>
      </Card>
    );

    expect(screen.getByRole('heading', { name: 'History Quiz' })).toBeDefined();
    expect(screen.getByText('Verified')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Answer Now' })).toBeDefined();
  });

  it('renders interactive modal dialog from UI SDK with callbacks', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Quit Session">
        <p>Leave trivia round?</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Quit Session')).toBeDefined();
    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders Input primitive with label and user interaction', () => {
    const handleChange = vi.fn();
    render(
      <Input
        label="Group Name"
        placeholder="Enter group name"
        onChange={handleChange}
      />
    );

    const input = screen.getByLabelText('Group Name');
    fireEvent.change(input, { target: { value: 'Trivia Masters' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});
