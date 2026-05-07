'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { repostVerificationPanel } from '@/actions/verification';
import { Button } from '@/components/ui/button';

interface RepostVerificationButtonProps {
  readonly guildId: string;
  readonly panelId: string;
}

export function RepostVerificationButton({
  guildId,
  panelId,
}: RepostVerificationButtonProps): React.JSX.Element {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  async function handleClick(): Promise<void> {
    if (submitting) return;
    const ok = window.confirm(
      'Repost the verification panel? The existing Discord message will be deleted and a new one will appear at the bottom of the channel.',
    );
    if (!ok) return;
    setSubmitting(true);
    const result = await repostVerificationPanel({ guildId, panelId });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    if (result.value.discordSyncFailed) {
      toast.warning(result.value.discordSyncMessage ?? 'Discord unreachable. Try again.');
      return;
    }
    toast.success('Verification panel reposted to channel');
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
