'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { retrySyncRolePickerPanel } from '@/actions/role-picker';
import { Button } from '@/components/ui/button';

interface RetrySyncRolePickerButtonProps {
  readonly guildId: string;
  readonly panelId: string;
}

export function RetrySyncRolePickerButton({
  guildId,
  panelId,
}: RetrySyncRolePickerButtonProps): React.JSX.Element {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  async function handleClick(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    const result = await retrySyncRolePickerPanel({ guildId, panelId });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    if (result.value.discordSyncFailed) {
      toast.warning(result.value.discordSyncMessage ?? 'Still failing. Try again later.');
      return;
    }
    toast.success('Role-picker panel synced to Discord');
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
      {submitting ? 'Syncing…' : 'Retry sync'}
    </Button>
  );
}
