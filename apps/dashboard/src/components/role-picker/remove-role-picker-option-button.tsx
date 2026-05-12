'use client';

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import {
  countRolePickerOptionHolders,
  removeRolePickerOption,
} from '@/actions/role-picker-options';
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

interface RemoveRolePickerOptionButtonProps {
  readonly guildId: string;
  readonly panelId: string;
  readonly optionId: string;
  readonly optionLabel: string;
  readonly optionEmoji: string | null;
}

export function RemoveRolePickerOptionButton({
  guildId,
  panelId,
  optionId,
  optionLabel,
  optionEmoji,
}: RemoveRolePickerOptionButtonProps): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [cleanupRoles, setCleanupRoles] = React.useState(false);
  const [holderCount, setHolderCount] = React.useState<number | null>(null);
  const [counting, setCounting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCounting(true);
    setHolderCount(null);
    setCleanupRoles(false);
    void countRolePickerOptionHolders({ guildId, panelId, optionId }).then((result) => {
      if (cancelled) return;
      setCounting(false);
      if (result.ok) setHolderCount(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [open, guildId, panelId, optionId]);

  async function handleConfirm(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    const result = await removeRolePickerOption({
      guildId,
      panelId,
      optionId,
      cleanupRoles,
    });
    setSubmitting(false);
    setOpen(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    const revoked = result.value.value.revokedCount;
    if (revoked > 0) {
      toast.success(
        `Option removed · revoked role from ${revoked} user${revoked === 1 ? '' : 's'}`,
      );
    } else {
      toast.success('Option removed');
    }
    if (result.value.discordSyncFailed) {
      toast.warning(result.value.discordSyncMessage ?? 'Discord sync failed — retry from panel.');
    }
    router.refresh();
  }

  const cleanupDisabled = counting || holderCount === 0;

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
          <DialogTitle>
            Remove{' '}
            {optionEmoji !== null ? (
              <span aria-hidden="true" className="mx-1">
                {optionEmoji}
              </span>
            ) : null}
            {optionLabel}?
          </DialogTitle>
          <DialogDescription>
            The option and its audit log row are removed. The dropdown updates automatically — no
            repost needed.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Current holders
          </p>
          {counting ? (
            <p className="flex items-center gap-2 text-sm text-[color:var(--color-fg-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Counting&hellip;
            </p>
          ) : holderCount === null ? (
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Could not load — proceed at your discretion.
            </p>
          ) : holderCount === 0 ? (
            <p className="text-sm">
              <span className="font-medium">No active holders.</span>{' '}
              <span className="text-[color:var(--color-fg-muted)]">Safe to remove.</span>
            </p>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-medium">
                  {holderCount} user{holderCount === 1 ? '' : 's'}
                </span>{' '}
                <span className="text-[color:var(--color-fg-muted)]">
                  currently hold this role (per audit log).
                </span>
              </p>
              <label className="mt-3 flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-[color:var(--color-border)]"
                  checked={cleanupRoles}
                  onChange={(e) => {
                    setCleanupRoles(e.target.checked);
                  }}
                  disabled={cleanupDisabled}
                />
                <span>
                  <span className="font-medium">
                    Also revoke the role from those {holderCount} user
                    {holderCount === 1 ? '' : 's'}.
                  </span>{' '}
                  <span className="text-[color:var(--color-fg-muted)]">
                    Best-effort — users who got the role outside the bot may be missed.
                  </span>
                </span>
              </label>
            </>
          )}
        </div>

        {cleanupRoles && holderCount !== null && holderCount > 0 ? (
          <div className="flex items-start gap-2 rounded-[var(--radius)] border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/5 p-3 text-xs">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-danger)]"
              aria-hidden="true"
            />
            <p>
              {holderCount} role assignment{holderCount === 1 ? '' : 's'} will be revoked. This
              cannot be undone.
            </p>
          </div>
        ) : null}

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
