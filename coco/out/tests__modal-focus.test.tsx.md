# tests/modal-focus.test.tsx
lines:52 exports:
---
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Test dialog">
        <input aria-label="Name" />
        <button>Save</button>
      </Modal>
    </>
  );
}

function openModal() {
  render(<Harness />);
  const trigger = screen.getByText('Open');
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, dialog: screen.getByRole('dialog') };
}

describe('Modal focus management', () => {
  it('moves focus into the dialog when it opens', () => {
    const { dialog } = openModal();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('keeps Tab inside the dialog in both directions', () => {
    const { dialog } = openModal();
    const close = screen.getByLabelText('Close modal');
    const save = screen.getByText('Save');

    save.focus();
    fireEvent.keyDown(save, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
