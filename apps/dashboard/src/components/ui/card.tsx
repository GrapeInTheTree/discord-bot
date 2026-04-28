import * as React from 'react';

import { cn } from '@/lib/cn';

// Card primitive — bordered container with no shadow. Used to group form
// sections, settings panels, and the Discord embed preview wrapper. The
// `destructive` variant adds a red border for "Delete panel" / "Delete
// ticket type" sections so the visual weight matches the action.

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { destructive?: boolean }
>(function Card({ className, destructive = false, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-lg)] border bg-[color:var(--color-bg)] text-[color:var(--color-fg)]',
        destructive && 'border-[color:var(--color-danger)]',
        className,
      )}
      {...props}
    />
  );
});

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return <div ref={ref} className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />;
  },
);

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function CardTitle({ className, ...props }, ref) {
  return (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  );
});

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-[color:var(--color-fg-muted)]', className)}
      {...props}
    />
  );
});

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
  },
);

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-end gap-2 p-6 pt-0', className)}
        {...props}
      />
    );
  },
);
