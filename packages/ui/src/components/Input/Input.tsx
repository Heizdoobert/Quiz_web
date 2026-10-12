import React, { forwardRef, useId } from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      prefixIcon,
      suffixIcon,
      id: customId,
      className = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || (label ? `input-${generatedId}` : undefined);

    const inputClasses = [
      'qq-input',
      error ? 'qq-input--error' : '',
      prefixIcon ? 'qq-input--has-prefix' : '',
      suffixIcon ? 'qq-input--has-suffix' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="qq-input-wrapper">
        {label && (
          <label htmlFor={inputId} className="qq-input-label">
            {label}
          </label>
        )}
        <div className="qq-input-container">
          {prefixIcon && <span className="qq-input__prefix">{prefixIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            aria-invalid={error ? 'true' : undefined}
            {...props}
          />
          {suffixIcon && <span className="qq-input__suffix">{suffixIcon}</span>}
        </div>
        {error ? (
          <p className="qq-input-error" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p className="qq-input-helper">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
