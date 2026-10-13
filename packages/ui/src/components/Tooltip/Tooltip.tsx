import React, { forwardRef, useState, cloneElement, isValidElement } from 'react';
import './Tooltip.css';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  title: React.ReactNode;
  placement?: TooltipPlacement;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  className?: string;
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      title,
      placement = 'top',
      children,
      className = '',
    },
    ref
  ) => {
    const [visible, setVisible] = useState(false);

    if (!title) {
      return children;
    }

    const show = () => setVisible(true);
    const hide = () => setVisible(false);

    const childProps = (isValidElement(children) ? children.props : {}) as React.HTMLAttributes<HTMLElement>;

    const trigger = isValidElement(children)
      ? cloneElement(children, {
          onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
            show();
            childProps.onMouseEnter?.(e);
          },
          onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
            hide();
            childProps.onMouseLeave?.(e);
          },
          onFocus: (e: React.FocusEvent<HTMLElement>) => {
            show();
            childProps.onFocus?.(e);
          },
          onBlur: (e: React.FocusEvent<HTMLElement>) => {
            hide();
            childProps.onBlur?.(e);
          },
        })
      : children;

    const tooltipClasses = [
      'qq-tooltip',
      `qq-tooltip--${placement}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span className="qq-tooltip-wrapper">
        {trigger}
        {visible && (
          <div ref={ref} role="tooltip" className={tooltipClasses}>
            {title}
          </div>
        )}
      </span>
    );
  }
);

Tooltip.displayName = 'Tooltip';
