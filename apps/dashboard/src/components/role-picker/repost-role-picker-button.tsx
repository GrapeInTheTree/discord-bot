'use client';

import { ArrowDownToLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { repostRolePickerPanel } from '@/actions/role-picker';
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

interface RepostRolePickerButtonProps {
  readonly guildId: string;
  readonly panelId: string;
}

export function RepostRolePickerButton({
  guildId,
  panelId,
}: RepostRolePickerButtonProps): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleConfirm(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    const result = await repostRolePickerPanel({ guildId, panelId });
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
    toast.success('Role-picker panel reposted to channel');
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
          <DialogTitle>Repost the role-picker panel?</DialogTitle>
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
              <span className="font-medium">Existing role grants stay.</span>{' '}
              <span className="text-[color:var(--color-fg-muted)]">
                Role grants are member-level, not message-level.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span
              className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-fg-muted)]"
              aria-hidden="true"
            />
            <span>
              <span className="font-medium">Audit log is preserved.</span>{' '}
              <span className="text-[color:var(--color-fg-muted)]">
                Granted / revoked events carry over to the new message.
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
