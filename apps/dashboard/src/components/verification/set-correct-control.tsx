'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { setCorrectVerificationOption } from '@/actions/verification';
import { Button } from '@/components/ui/button';

interface OptionSummary {
  readonly id: string;
  readonly label: string;
  readonly emoji: string;
}

interface SetCorrectControlProps {
  readonly guildId: string;
  readonly panelId: string;
  readonly options: readonly OptionSummary[];
  readonly correctOptionId: string | null;
}

/**
 * Inline dropdown + button for marking the correct option directly from
 * the panel detail page. No dedicated route — toggling correctness is a
 * single-field operation that doesn't deserve its own page.
 */
export function SetCorrectControl({
  guildId,
  panelId,
  options,
  correctOptionId,
}: SetCorrectControlProps): React.JSX.Element {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string>(correctOptionId ?? '');
  const [submitting, setSubmitting] = React.useState(false);

  async function handleClick(): Promise<void> {
    if (submitting) return;
    if (selected === '') {
      toast.error('Pick an option first.');
      return;
    }
    if (selected === correctOptionId) {
      toast.info('That option is already marked correct.');
      return;
    }
    setSubmitting(true);
    const result = await setCorrectVerificationOption({
      guildId,
      panelId,
      optionId: selected,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success('Correct option updated. Repost to publish.');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
        }}
        className="h-9 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 text-sm"
        aria-label="Pick the correct option"
      >
        <option value="">Pick the correct option</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.emoji !== '' ? `${o.emoji} ` : ''}
            {o.label}
          </option>
        ))}
      </select>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          void handleClick();
        }}
        disabled={submitting || options.length === 0}
      >
        {submitting ? 'Saving…' : 'Set as correct'}
      </Button>
    </div>
  );
}
