'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { removeVerificationOption } from '@/actions/verification-options';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RemoveOptionButtonProps {
  readonly guildId: string;
  readonly panelId: string;
  readonly optionId: string;
  readonly optionLabel: string;
}

export function RemoveOptionButton({
  guildId,
  panelId,
  optionId,
  optionLabel,
}: RemoveOptionButtonProps): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleConfirm(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    const result = await removeVerificationOption({ guildId, panelId, optionId });
    setSubmitting(false);
    setOpen(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success('Option removed');
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove option &ldquo;{optionLabel}&rdquo;?</DialogTitle>
          <DialogDescription>
            The option disappears from the panel definition. Repost the panel to push the change to
            the live Discord message.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5 text-sm">
          <li className="flex items-start gap-2">
            <span
              className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-fg-muted)]"
              aria-hidden="true"
            />
            <span>
              <span className="font-medium">Already-verified users stay verified.</span>{' '}
              <span className="text-[color:var(--color-fg-muted)]">
                Role grants are member-level — removing the option doesn&rsquo;t revoke them.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span
              className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-fg-muted)]"
              aria-hidden="true"
            />
            <span>
              <span className="font-medium">Past attempts stay in the audit log.</span>{' '}
              <span className="text-[color:var(--color-fg-muted)]">
                History is preserved even when the option is gone.
              </span>
            </span>
          </li>
        </ul>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="danger"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={submitting}
          >
            {submitting ? 'Removing…' : 'Remove option'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
