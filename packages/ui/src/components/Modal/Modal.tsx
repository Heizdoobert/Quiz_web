import React, { useEffect, useId, useRef } from 'react';
import './Modal.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  className = '',
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div
      className="qq-modal-backdrop"
      data-testid="qq-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={`qq-modal-container ${className}`.trim()}
      >
        {(title || description) && (
          <div className="qq-modal-header">
            <div className="qq-modal-header-text">
              {title && (
                <h2 id={titleId} className="qq-modal-title">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="qq-modal-description">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              className="qq-modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}
        <div className="qq-modal-body">{children}</div>
        {footer && <div className="qq-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';
