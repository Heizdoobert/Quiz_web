import React, { useEffect } from 'react';

export interface ModalProps {
  /** Controls whether the modal is visible */
  isOpen?: boolean;
  /** Alias for isOpen used by tests */
  open?: boolean;
  /** Callback when the modal should be closed */
  onClose: () => void;
  /** Optional title */
  title?: string;
  /** Optional description text */
  description?: string;
  /** Optional footer element */
  footer?: React.ReactNode;
  /** When true, clicking the backdrop does not close the modal */
  closeOnBackdropClick?: boolean;
  /** Modal content */
  children: React.ReactNode;
}

/** Simple accessible Modal component */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  open,
  onClose,
  title,
  description,
  footer,
  closeOnBackdropClick = true,
  children,
}) => {
    // Close on Escape key globally
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  const visible = isOpen ?? open ?? false;
  if (!visible) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnBackdropClick) return;
    // Ensure click is on backdrop, not on inner content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      role="dialog"
      aria-modal="true"
      data-testid="qq-modal-backdrop"
      onClick={handleBackdropClick}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
        {description && <p className="mb-2 text-gray-600">{description}</p>}
        <div className="mb-4">{children}</div>
        {footer && <div className="mb-4">{footer}</div>}
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close modal
        </button>
      </div>
    </div>
  );
};
