'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/cn';

// Modal primitive built on Radix Dialog. Used for destructive
// confirmations (repost, delete) where window.confirm's monoline
// styling was too cramped — operators need to see context (what
// changes, what stays, how many users are affected) before they
// commit. Compose like:
//
//   <Dialog>
//     <DialogTrigger asChild><Button>…</Button></DialogTrigger>
//     <DialogContent>
//       <DialogHeader>
//         <DialogTitle>…</DialogTitle>
//         <DialogDescription>…</DialogDescription>
//       </DialogHeader>
//       <div>…body…</div>
//       <DialogFooter>
//         <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
//         <Button onClick={…}>Confirm</Button>
//       </DialogFooter>
//     </DialogContent>
//   </Dialog>
//
// Radix gives focus trap, escape-to-close, backdrop click, and aria
// labelling for free. Animations are CSS keyframes via Tailwind
// classes; tailwind.config has no extra setup required because we use
// data-state selectors directly.

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-150',
        'data-[state=closed]:opacity-0',
        className,
      )}
      {...props}
    />
  );
});

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(function DialogContent({ className, children, ...props }, ref) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-5',
          'rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-6 shadow-lg',
          'transition-opacity duration-150',
          'data-[state=closed]:opacity-0',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            'absolute right-4 top-4 rounded-[var(--radius-sm)] opacity-70 transition-opacity hover:opacity-100',
            'focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]',
            'disabled:pointer-events-none',
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />;
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2', className)}
      {...props}
    />
  );
}

export const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
});

export const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-[color:var(--color-fg-muted)]', className)}
      {...props}
    />
  );
});
