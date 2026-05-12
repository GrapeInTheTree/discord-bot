'use client';

import { RolePickerOptionInputSchema } from '@hearth/role-picker-core/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { addRolePickerOption, updateRolePickerOption } from '@/actions/role-picker-options';
import { RolePicker } from '@/components/pickers/role-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FormSchema = RolePickerOptionInputSchema;
type FormValues = z.infer<typeof FormSchema>;

interface RoleOption {
  readonly id: string;
  readonly name: string;
  readonly color: number;
}

interface RolePickerOptionFormProps {
  readonly guildId: string;
  readonly panelId: string;
  readonly roles: readonly RoleOption[];
  readonly initial?: {
    readonly optionId: string;
    readonly label: string;
    readonly description: string | null;
    readonly emoji: string | null;
    readonly roleId: string;
    readonly position: number;
  };
}

export function RolePickerOptionForm({
  guildId,
  panelId,
  roles,
  initial,
}: RolePickerOptionFormProps): React.JSX.Element {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    mode: 'onChange',
    defaultValues: {
      label: initial?.label ?? '',
      description: initial?.description ?? undefined,
      emoji: initial?.emoji ?? undefined,
      roleId: initial?.roleId ?? '',
      position: initial?.position ?? 0,
    },
  });

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      // Strip empty optional strings → undefined so the action's null-vs-omit
      // semantics stay clean (the bot's edit path treats undefined as
      // "leave column alone" and null as "clear it").
      const cleaned: FormValues = {
        ...values,
        description:
          values.description !== undefined && values.description !== ''
            ? values.description
            : undefined,
        emoji: values.emoji !== undefined && values.emoji !== '' ? values.emoji : undefined,
      };

      const result =
        initial !== undefined
          ? await updateRolePickerOption({
              guildId,
              panelId,
              optionId: initial.optionId,
              input: cleaned,
            })
          : await addRolePickerOption({ guildId, panelId, input: cleaned });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(initial !== undefined ? 'Option updated' : 'Option added');
      router.push(`/g/${guildId}/role-picker/${panelId}`);
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
        <Label htmlFor="rp-option-label">Label</Label>
        <Input
          id="rp-option-label"
          maxLength={80}
          aria-invalid={errors.label !== undefined}
          placeholder="e.g. English"
          {...register('label')}
        />
        {errors.label !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.label.message}</p>
        ) : (
          <p className="text-xs text-[color:var(--color-fg-muted)]">Shown as the dropdown row.</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="rp-option-description">Description (optional)</Label>
        <Input
          id="rp-option-description"
          maxLength={100}
          aria-invalid={errors.description !== undefined}
          placeholder="Sub-line shown under the label"
          {...register('description')}
        />
        {errors.description !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.description.message}</p>
        ) : (
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            Discord renders this in a smaller font beneath the label.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="rp-option-emoji">Emoji (optional)</Label>
        <Input
          id="rp-option-emoji"
          maxLength={64}
          aria-invalid={errors.emoji !== undefined}
          placeholder="🇺🇸"
          {...register('emoji')}
        />
        {errors.emoji !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.emoji.message}</p>
        ) : (
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            Unicode emoji or custom <code className="font-mono">{'<:name:id>'}</code>. Renders left
            of the label.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="rp-option-role">Role to grant</Label>
        <Controller
          name="roleId"
          control={control}
          render={({ field }) => (
            <RolePicker
              id="rp-option-role"
              roles={roles}
              value={field.value}
              onChange={field.onChange}
              placeholder="Pick a role"
            />
          )}
        />
        {errors.roleId !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.roleId.message}</p>
        ) : (
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            Granted when this option is picked; revoked when the user picks a different option. The
            bot&rsquo;s role must be above this role.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="rp-option-position">Position</Label>
        <Input
          id="rp-option-position"
          type="number"
          min={0}
          max={24}
          aria-invalid={errors.position !== undefined}
          {...register('position', { valueAsNumber: true })}
        />
        {errors.position !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.position.message}</p>
        ) : (
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            Slot 0-24 — controls the dropdown order (top-to-bottom). Must be unique per panel.
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
