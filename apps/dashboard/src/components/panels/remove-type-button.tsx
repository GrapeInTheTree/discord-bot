'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { removeTicketType } from '@/actions/ticket-types';
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

interface RemoveTypeButtonProps {
  readonly guildId: string;
  readonly typeId: string;
  readonly typeName: string;
}

export function RemoveTypeButton({
  guildId,
  typeId,
  typeName,
}: RemoveTypeButtonProps): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleConfirm(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    const result = await removeTicketType({ guildId, typeId });
    setSubmitting(false);
    setOpen(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    if (result.value.discordSyncFailed) {
      toast.warning('Removed. Discord re-render queued — retry from the panel detail page.');
    } else {
      toast.success(`Type "${typeName}" removed`);
    }
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
          <DialogTitle>Remove ticket type &ldquo;{typeName}&rdquo;?</DialogTitle>
          <DialogDescription>
            The button disappears from the panel and members will no longer be able to open this
            ticket type. Tickets already opened under it stay open and reachable.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5 text-sm">
          <li className="flex items-start gap-2">
            <span
              className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-fg-muted)]"
              aria-hidden="true"
            />
            <span>
              <span className="font-medium">The panel embed updates automatically.</span>{' '}
              <span className="text-[color:var(--color-fg-muted)]">
                No need to repost unless you want a fresh message at the bottom.
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
            {submitting ? 'Removing…' : 'Remove type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
