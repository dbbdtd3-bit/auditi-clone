import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-md border border-dataly-line bg-dataly-surface px-3 py-2 text-sm text-dataly-ink ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-dataly-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dataly-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-dataly-surface-subtle disabled:opacity-70',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
