import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../src/components/Modal';

describe('Modal Primitive', () => {
  it('does not render content when open is false', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Hidden Modal">
        Hidden Body
      </Modal>
    );
    expect(screen.queryByText('Hidden Modal')).toBeNull();
    expect(screen.queryByText('Hidden Body')).toBeNull();
  });

  it('renders modal dialog with title, description, body, and footer when open is true', () => {
    render(
      <Modal
        open={true}
        onClose={vi.fn()}
        title="Confirm Reset"
        description="Are you sure you want to restart?"
        footer={<button>Confirm</button>}
      >
        Modal content goes here
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Confirm Reset')).toBeDefined();
    expect(screen.getByText('Are you sure you want to restart?')).toBeDefined();
    expect(screen.getByText('Modal content goes here')).toBeDefined();
    expect(screen.getByText('Confirm')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Closable Modal">
        Body
      </Modal>
    );
    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Escape Modal">
        Body
      </Modal>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop overlay is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Backdrop Modal">
        Body
      </Modal>
    );
    const backdrop = screen.getByTestId('qq-modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose on backdrop click when closeOnBackdropClick is false', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Locked Modal" closeOnBackdropClick={false}>
        Body
      </Modal>
    );
    const backdrop = screen.getByTestId('qq-modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).not.toHaveBeenCalled();
  });
});
