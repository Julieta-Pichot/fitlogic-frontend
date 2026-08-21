import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border border-transparent text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

Button.displayName = 'Button';
