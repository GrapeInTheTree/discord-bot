'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { addTicketType, editTicketType } from '@/actions/ticket-types';
import { CategoryPicker } from '@/components/pickers/category-picker';
import { RoleMultiPicker } from '@/components/pickers/role-multi-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ButtonStyle = 'primary' | 'secondary' | 'success' | 'danger';
const BUTTON_STYLES: readonly { value: ButtonStyle; label: string }[] = [
  { value: 'primary', label: 'Primary (blurple)' },
  { value: 'secondary', label: 'Secondary (grey)' },
  { value: 'success', label: 'Success (green)' },
  { value: 'danger', label: 'Danger (red)' },
];

interface Category {
  readonly id: string;
  readonly name: string;
}
interface Role {
  readonly id: string;
  readonly name: string;
  readonly color: number;
}

interface TicketTypeFormProps {
  readonly guildId: string;
  readonly panelId: string;
  readonly categories: readonly Category[];
  readonly roles: readonly Role[];
  /**
   * When provided, the form is in "edit" mode for an existing type.
   * Name is locked (renaming requires remove + add to keep slash-command
   * `name:` references stable).
   */
  readonly initial?: {
    readonly typeId: string;
    readonly name: string;
    readonly label: string;
    readonly emoji: string;
    readonly buttonStyle: ButtonStyle;
    readonly activeCategoryId: string;
    readonly supportRoleIds: readonly string[];
    readonly pingRoleIds: readonly string[];
    readonly perUserLimit: number | null;
    readonly welcomeMessage: string | null;
  };
}

const SESSION_KEY_PREFIX = 'ticket-type-form:';

// Form schema for the dashboard. Mirrors `TicketTypeInputSchema` in
// @hearth/tickets-core but adapts shape to what an HTML form actually
// produces:
//   - perUserLimit is `string` (input type=number gives strings); we
//     coerce + parse at submit time.
//   - welcomeMessage is plain `string` (form always has the textarea
//     bound); we map empty → null/undefined at submit.
//   - `name` is required only in create mode (initial === undefined),
//     enforced by branching on the schema before resolverbinding.
const SnowflakeFormSchema = z
  .string()
  .regex(/^\d{17,20}$/, 'Discord snowflake must be 17–20 digits');

const PerUserLimitSchema = z.string().refine((v) => {
  if (v.trim() === '') return true;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 20;
}, 'Must be a whole number between 1 and 20');

const BaseFormSchema = z.object({
  name: z.string(), // locked in edit mode, validated only in create
  label: z.string().min(1, 'Button label is required').max(80),
  emoji: z.string().max(64),
  buttonStyle: z.enum(['primary', 'secondary', 'success', 'danger']),
  activeCategoryId: SnowflakeFormSchema,
  supportRoleIds: z
    .array(SnowflakeFormSchema)
    .min(1, 'Pick at least one support role')
    .max(20, 'Maximum 20 support roles'),
  pingRoleIds: z.array(SnowflakeFormSchema).max(20, 'Maximum 20 ping roles'),
  perUserLimit: PerUserLimitSchema,
  welcomeMessage: z.string().max(4000, 'Welcome message must be 4000 characters or fewer'),
});

const CreateFormSchema = BaseFormSchema.extend({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(32, 'Name must be 32 characters or fewer')
    .regex(
      /^[a-z0-9-]+$/,
      'Use lowercase letters, digits, and hyphens only — no spaces or capitals',
    ),
});

type FormValues = z.infer<typeof BaseFormSchema>;

export function TicketTypeForm({
  guildId,
  panelId,
  categories,
  roles,
  initial,
}: TicketTypeFormProps): React.JSX.Element {
  const router = useRouter();
  const sessionKey = `${SESSION_KEY_PREFIX}${initial?.typeId ?? `new:${panelId}`}`;
  const isEdit = initial !== undefined;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? BaseFormSchema : CreateFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: initial?.name ?? '',
      label: initial?.label ?? '',
      emoji: initial?.emoji ?? '',
      buttonStyle: initial?.buttonStyle ?? 'success',
      activeCategoryId: initial?.activeCategoryId ?? '',
      supportRoleIds: [...(initial?.supportRoleIds ?? [])],
      pingRoleIds: [...(initial?.pingRoleIds ?? [])],
      perUserLimit:
        initial?.perUserLimit !== null && initial?.perUserLimit !== undefined
          ? String(initial.perUserLimit)
          : '1',
      welcomeMessage: initial?.welcomeMessage ?? '',
    },
  });

  // Hydrate from sessionStorage once on mount. We bypass validation
  // (shouldValidate: false) so transient-bad persisted state doesn't
  // flash error messages before the user has even touched a field.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(sessionKey);
    if (stored === null) return;
    try {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      if (typeof parsed.name === 'string') setValue('name', parsed.name);
      if (typeof parsed.label === 'string') setValue('label', parsed.label);
      if (typeof parsed.emoji === 'string') setValue('emoji', parsed.emoji);
      if (typeof parsed.buttonStyle === 'string') {
        setValue('buttonStyle', parsed.buttonStyle as ButtonStyle);
      }
      if (typeof parsed.activeCategoryId === 'string') {
        setValue('activeCategoryId', parsed.activeCategoryId);
      }
      if (Array.isArray(parsed.supportRoleIds)) {
        setValue(
          'supportRoleIds',
          parsed.supportRoleIds.filter((s): s is string => typeof s === 'string'),
        );
      }
      if (Array.isArray(parsed.pingRoleIds)) {
        setValue(
          'pingRoleIds',
          parsed.pingRoleIds.filter((s): s is string => typeof s === 'string'),
        );
      }
      if (typeof parsed.perUserLimit === 'string') setValue('perUserLimit', parsed.perUserLimit);
      if (typeof parsed.welcomeMessage === 'string') {
        setValue('welcomeMessage', parsed.welcomeMessage);
      }
    } catch {
      // Ignore — corrupted persisted state.
    }
  }, [sessionKey, setValue]);

  // Persist the entire form state on every change.
  const watched = watch();
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(sessionKey, JSON.stringify(watched));
  }, [sessionKey, watched]);

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      const limit =
        values.perUserLimit.trim() === '' ? null : Number.parseInt(values.perUserLimit, 10);
      const result = isEdit
        ? await editTicketType({
            guildId,
            typeId: initial.typeId,
            fields: {
              label: values.label,
              emoji: values.emoji,
              buttonStyle: values.buttonStyle,
              activeCategoryId: values.activeCategoryId,
              supportRoleIds: values.supportRoleIds,
              pingRoleIds: values.pingRoleIds,
              perUserLimit: limit !== null && Number.isFinite(limit) ? limit : null,
              welcomeMessage: values.welcomeMessage === '' ? null : values.welcomeMessage,
            },
          })
        : await addTicketType({
            guildId,
            input: {
              panelId,
              name: values.name,
              label: values.label,
              emoji: values.emoji,
              buttonStyle: values.buttonStyle,
              activeCategoryId: values.activeCategoryId,
              supportRoleIds: values.supportRoleIds,
              pingRoleIds: values.pingRoleIds,
              perUserLimit: limit !== null && Number.isFinite(limit) ? limit : null,
              welcomeMessage: values.welcomeMessage === '' ? undefined : values.welcomeMessage,
            },
          });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(sessionKey);
      }
      if (result.value.discordSyncFailed) {
        toast.warning('Saved. Discord re-render queued — retry from the panel detail page.');
      } else {
        toast.success(isEdit ? 'Type updated' : 'Type added');
      }
      router.push(`/g/${guildId}/panels/${panelId}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unexpected error');
    }
  }

  const helperOrError = (
    fieldError: { message?: string } | undefined,
    helper: React.ReactNode,
  ): React.JSX.Element =>
    fieldError !== undefined ? (
      <p className="text-xs text-[color:var(--color-danger)]">{fieldError.message}</p>
    ) : (
      <p className="text-xs text-[color:var(--color-fg-muted)]">{helper}</p>
    );

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="flex max-w-2xl flex-col gap-4"
    >
      {!isEdit ? (
        <div className="grid gap-2">
          <Label htmlFor="type-name">Name (stable identifier)</Label>
          <Input
            id="type-name"
            placeholder="e.g. support-question"
            maxLength={32}
            aria-invalid={errors.name !== undefined}
            {...register('name')}
          />
          {helperOrError(
            errors.name,
            <>
              Lowercase letters, digits, and hyphens. Used internally — to rename, remove and
              re-add.
            </>,
          )}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="type-label">Button label</Label>
        <Input
          id="type-label"
          placeholder="e.g. Question"
          maxLength={80}
          aria-invalid={errors.label !== undefined}
          {...register('label')}
        />
        {errors.label !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.label.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type-emoji">Button emoji</Label>
        <Input
          id="type-emoji"
          placeholder="e.g. ❓ (leave blank for none)"
          maxLength={64}
          {...register('emoji')}
        />
        {errors.emoji !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.emoji.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type-style">Button style</Label>
        <select
          id="type-style"
          {...register('buttonStyle')}
          className="flex h-9 w-full appearance-none rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
        >
          {BUTTON_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type-category">Active category</Label>
        <Controller
          name="activeCategoryId"
          control={control}
          render={({ field }) => (
            <CategoryPicker
              id="type-category"
              categories={categories}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {helperOrError(
          errors.activeCategoryId,
          'New tickets of this type are created as channels under this category.',
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type-support-roles">Support roles</Label>
        <Controller
          name="supportRoleIds"
          control={control}
          render={({ field }) => (
            <RoleMultiPicker
              id="type-support-roles"
              roles={roles}
              value={field.value}
              onChange={field.onChange}
              placeholder="Pick one or more support roles"
            />
          )}
        />
        {helperOrError(
          errors.supportRoleIds,
          'Roles allowed to claim, close, and reopen tickets of this type.',
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type-ping-roles">Ping roles (optional)</Label>
        <Controller
          name="pingRoleIds"
          control={control}
          render={({ field }) => (
            <RoleMultiPicker
              id="type-ping-roles"
              roles={roles}
              value={field.value}
              onChange={field.onChange}
              placeholder="Pick roles to mention on ticket creation"
            />
          )}
        />
        {errors.pingRoleIds !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">{errors.pingRoleIds.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type-limit">Per-user limit</Label>
        <Input
          id="type-limit"
          type="number"
          min={1}
          max={20}
          aria-invalid={errors.perUserLimit !== undefined}
          {...register('perUserLimit')}
        />
        {helperOrError(errors.perUserLimit, 'Max simultaneous open tickets per user (default 1).')}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type-welcome">Welcome message (optional)</Label>
        <Textarea
          id="type-welcome"
          maxLength={4000}
          placeholder="Leave blank to use the default welcome copy"
          aria-invalid={errors.welcomeMessage !== undefined}
          {...register('welcomeMessage')}
        />
        {errors.welcomeMessage !== undefined ? (
          <p className="text-xs text-[color:var(--color-danger)]">
            {errors.welcomeMessage.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add type'}
        </Button>
      </div>
    </form>
  );
}
