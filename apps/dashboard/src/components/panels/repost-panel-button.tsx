'use client';

import { ArrowDownToLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { repostPanel } from '@/actions/panels';
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

interface RepostPanelButtonProps {
  readonly guildId: string;
  readonly panelId: string;
}

export function RepostPanelButton({ guildId, panelId }: RepostPanelButtonProps): React.JSX.Element {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  async function handleConfirm(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    const result = await repostPanel({ guildId, panelId });
    setSubmitting(false);
    setOpen(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    if (result.value.discordSyncFailed) {
      toast.warning(result.value.discordSyncMessage ?? 'Discord unreachable. Try again.');
      return;
    }
    toast.success('Panel reposted to channel');
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Repost to channel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repost the panel?</DialogTitle>
          <DialogDescription>
            The existing Discord message will be deleted and a new one will appear at the bottom of
            the channel.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5 text-sm">
          <li className="flex items-start gap-2">
            <span
              className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-accent)]"
              aria-hidden="true"
            />
            <span>
              <span className="font-medium">Ticket types and open tickets stay.</span>{' '}
              <span className="text-[color:var(--color-fg-muted)]">
                Only the Discord message itself is replaced.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span
              className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-fg-muted)]"
              aria-hidden="true"
            />
            <span>
              <span className="font-medium">Old message disappears.</span>{' '}
              <span className="text-[color:var(--color-fg-muted)]">
                Anyone scrolled to it will see it vanish.
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
            onClick={() => {
              void handleConfirm();
            }}
            disabled={submitting}
          >
            {submitting ? 'Reposting…' : 'Repost panel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
