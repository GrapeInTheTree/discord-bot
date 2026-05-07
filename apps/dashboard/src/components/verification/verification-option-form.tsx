'use client';

import { VerificationOptionInputSchema } from '@hearth/verification-core/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { addVerificationOption, updateVerificationOption } from '@/actions/verification-options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FormSchema = VerificationOptionInputSchema;
type FormValues = z.infer<typeof FormSchema>;

interface VerificationOptionFormProps {
  readonly guildId: string;
  readonly panelId: string;
  /** When set, the form is in "edit" mode against this option id. */
  readonly initial?: {
    readonly optionId: string;
    readonly label: string;
    readonly emoji: string;
    readonly buttonStyle: 'primary' | 'secondary' | 'success' | 'danger';
    readonly position: number;
  };
}

export function VerificationOptionForm({
  guildId,
  panelId,
  initial,
}: VerificationOptionFormProps): React.JSX.Element {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    mode: 'onChange',
    defaultValues: {
      label: initial?.label ?? '',
      emoji: initial?.emoji ?? '',
      buttonStyle: initial?.buttonStyle ?? 'primary',
      position: initial?.position ?? 0,
    },
  });

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      const result =
        initial !== undefined
          ? await updateVerificationOption({
              guildId,
              panelId,
              optionId: initial.optionId,
              input: values,
            })
          : await addVerificationOption({ guildId, panelId, input: values });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(initial !== undefined ? 'Option updated' : 'Option added');
      router.push(`/g/${guildId}/verification/${panelId}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unexpected error');
    }
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="flex max-w-xl flex-col gap-4"
    >
      <div className="grid gap-2">
        <Label htmlFor="option-label">Button label</Label>
        <Input
          id="option-label"
          maxLength={80}
          aria-invalid={errors.label !== undefined}
          placeholder="e.g. Apple"
          {...register('label')}
        />
        {errors.label !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.label.message}</p>
        ) : (
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            Visible button text. Keep it short — Discord renders 80 chars max.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="option-emoji">Emoji</Label>
        <Input
          id="option-emoji"
          maxLength={64}
          aria-invalid={errors.emoji !== undefined}
          placeholder="🍎"
          {...register('emoji')}
        />
        {errors.emoji !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.emoji.message}</p>
        ) : (
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            Unicode emoji like <code className="font-mono">🍎</code> or a Discord custom emoji
            reference like <code className="font-mono">{'<:name:id>'}</code>.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="option-style">Button style</Label>
        <select
          id="option-style"
          className="h-9 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 text-sm"
          {...register('buttonStyle')}
        >
          <option value="primary">Primary (blue)</option>
          <option value="secondary">Secondary (gray)</option>
          <option value="success">Success (green)</option>
          <option value="danger">Danger (red)</option>
        </select>
        {errors.buttonStyle !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.buttonStyle.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="option-position">Position</Label>
        <Input
          id="option-position"
          type="number"
          min={0}
          max={4}
          aria-invalid={errors.position !== undefined}
          {...register('position', { valueAsNumber: true })}
        />
        {errors.position !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.position.message}</p>
        ) : (
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            Slot 0-4 (left-to-right). Must be unique per panel.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : initial !== undefined ? 'Save changes' : 'Add option'}
        </Button>
      </div>
    </form>
  );
}
