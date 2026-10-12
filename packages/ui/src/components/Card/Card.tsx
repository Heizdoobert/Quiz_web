import React, { forwardRef } from 'react';
import './Card.css';

export type CardVariant = 'default' | 'bordered' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', padding = 'md', className = '', ...props }, ref) => {
    const classNames = [
      'qq-card',
      `qq-card--${variant}`,
      `qq-card--p-${padding}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`qq-card__header ${className}`.trim()} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, as: Tag = 'h3', className = '', ...props }, ref) => {
    return React.createElement(
      Tag,
      {
        ref,
        className: `qq-card__title ${className}`.trim(),
        ...props,
      },
      children
    );
  }
);
CardTitle.displayName = 'CardTitle';

export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className = '', ...props }, ref) => (
    <p ref={ref} className={`qq-card__description ${className}`.trim()} {...props}>
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`qq-card__content ${className}`.trim()} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`qq-card__footer ${className}`.trim()} {...props}>
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';
