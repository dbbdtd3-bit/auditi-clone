import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-[14px] transition-colors focus:outline-none focus:ring-2 focus:ring-dataly-blue focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-dataly-navy text-white',
        secondary:
          'border-dataly-line bg-dataly-surface-subtle text-dataly-slate',
        destructive:
          'border-transparent bg-dataly-danger-soft text-dataly-danger',
        danger:
          'border-transparent bg-dataly-danger-soft text-dataly-danger',
        outline: 'border-dataly-line text-dataly-slate',
        success:
          'border-transparent bg-dataly-success-soft text-dataly-success',
        warning:
          'border-transparent bg-dataly-warning-soft text-dataly-warning',
        info:
          'border-transparent bg-dataly-info-soft text-dataly-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
