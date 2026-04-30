'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { repostPanel } from '@/actions/panels';
import { Button } from '@/components/ui/button';

interface RepostPanelButtonProps {
  readonly guildId: string;
  readonly panelId: string;
}

/**
 * "Repost to channel" — drops the existing Discord message and sends a
 * fresh one with the same DB state (panel + types + tickets all stay).
 * The new message lands at the bottom of the channel so members can
 * find the panel again after channel chatter buried it.
 *
 * Confirms via window.confirm() rather than a Dialog — single
 * destructive consequence (one channel message disappears + one
 * appears), no follow-up choices, fast path more important than
 * polished UX. Matches the "delete-panel" interaction shape.
 */
export function RepostPanelButton({ guildId, panelId }: RepostPanelButtonProps): React.JSX.Element {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  async function handleClick(): Promise<void> {
    if (submitting) return;
    const ok = window.confirm(
      'Repost the panel? The existing Discord message will be deleted and a new one will appear at the bottom of the channel. Ticket types and open tickets are not affected.',
    );
    if (!ok) return;
    setSubmitting(true);
    const result = await repostPanel({ guildId, panelId });
    setSubmitting(false);
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
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        void handleClick();
      }}
      disabled={submitting}
    >
      {submitting ? 'Reposting…' : 'Repost to channel'}
    </Button>
  );
}
