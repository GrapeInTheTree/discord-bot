import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/cn';

// Variant matrix:
// - default: solid accent — primary action ("Create panel", "Save")
// - secondary: outlined fg — neutral action
// - ghost: text-only — least emphasis (e.g., "Cancel", icon-only buttons)
// - danger: destructive (red border) — used in destructive Card sections
// - link: inline link with underline-on-hover
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] hover:opacity-90',
        secondary:
          'border border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-subtle)]',
        ghost: 'text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-subtle)]',
        danger:
          'border border-[color:var(--color-danger)] bg-[color:var(--color-bg)] text-[color:var(--color-danger)] hover:bg-[color:var(--color-bg-subtle)]',
        link: 'text-[color:var(--color-accent)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});

export { buttonVariants };
