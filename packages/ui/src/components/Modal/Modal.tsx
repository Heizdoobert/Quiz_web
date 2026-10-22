import React from 'react';

export interface ModalProps {
  /** Controls whether the modal is visible */
  isOpen: boolean;
  /** Callback when the modal should be closed */
  onClose: () => void;
  /** Optional title */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
}

/** Simple accessible Modal component */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4">
        {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
        <div className="mb-4">{children}</div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};
