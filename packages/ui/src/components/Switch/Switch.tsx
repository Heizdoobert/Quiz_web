import React, { forwardRef, useState } from 'react';
import './Switch.css';

export type SwitchSize = 'sm' | 'md';

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  size?: SwitchSize;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      size = 'md',
      disabled = false,
      onChange,
      className = '',
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const isControlled = controlledChecked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
    const isChecked = isControlled ? controlledChecked : uncontrolledChecked;

    const toggle = () => {
      if (disabled) return;
      const nextChecked = !isChecked;
      if (!isControlled) {
        setUncontrolledChecked(nextChecked);
      }
      onChange?.(nextChecked);
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      toggle();
      onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
      onKeyDown?.(e);
    };

    const classNames = [
      'qq-switch',
      `qq-switch--${size}`,
      isChecked ? 'qq-switch--checked' : '',
      disabled ? 'qq-switch--disabled' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked ? 'true' : 'false'}
        aria-disabled={disabled ? 'true' : undefined}
        disabled={disabled}
        className={classNames}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span className="qq-switch__handle" aria-hidden="true" />
      </button>
    );
  }
);

Switch.displayName = 'Switch';
