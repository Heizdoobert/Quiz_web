import React, { forwardRef, useState } from 'react';
import './Alert.css';

export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  type?: AlertType;
  message?: React.ReactNode;
  description?: React.ReactNode;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  closable?: boolean;
  onClose?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      type = 'info',
      message,
      description,
      title,
      icon,
      closable = false,
      onClose,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const [closed, setClosed] = useState(false);

    if (closed) {
      return null;
    }

    const heading = title || (description ? message : undefined);
    const content = description || message || children;

    const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
      setClosed(true);
      onClose?.(e);
    };

    const classNames = [
      'qq-alert',
      `qq-alert--${type}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} role="alert" className={classNames} {...props}>
        {icon && (
          <span className="qq-alert__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="qq-alert__content">
          {heading && <div className="qq-alert__title">{heading}</div>}
          {content && (
            <div className="qq-alert__description">
              {description ? description : content}
            </div>
          )}
        </div>
        {closable && (
          <button
            type="button"
            aria-label="Close"
            className="qq-alert__close"
            onClick={handleClose}
          >
            ✕
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
