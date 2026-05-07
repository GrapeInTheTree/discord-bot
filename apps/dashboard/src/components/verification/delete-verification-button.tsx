'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { deleteVerificationPanel } from '@/actions/verification';
import { Button } from '@/components/ui/button';

interface DeleteVerificationButtonProps {
  readonly guildId: string;
  readonly panelId: string;
}

export function DeleteVerificationButton({
  guildId,
  panelId,
}: DeleteVerificationButtonProps): React.JSX.Element {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  async function handleClick(): Promise<void> {
    if (submitting) return;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Delete this verification panel? The Discord message, options, and event log are removed permanently.',
      );
      if (!confirmed) return;
    }
    setSubmitting(true);
    const result = await deleteVerificationPanel({ guildId, panelId });
    if (!result.ok) {
      toast.error(result.error.message);
      setSubmitting(false);
      return;
    }
    toast.success('Verification panel deleted');
    router.push(`/g/${guildId}/verification`);
    router.refresh();
  }

  return (
    <Button
      variant="danger"
      onClick={() => {
        void handleClick();
      }}
      disabled={submitting}
    >
      {submitting ? 'Deleting…' : 'Delete panel'}
    </Button>
  );
}
