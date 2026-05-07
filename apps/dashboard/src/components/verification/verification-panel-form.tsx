'use client';

import { VerificationPanelInputSchema } from '@hearth/verification-core/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { VerificationPreview } from './verification-preview';

import { createVerificationPanel, updateVerificationPanel } from '@/actions/verification';
import { ChannelPicker } from '@/components/pickers/channel-picker';
import { RolePicker } from '@/components/pickers/role-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ChannelOption {
  readonly id: string;
  readonly name: string;
  readonly type: 'text' | 'announcement';
}

interface RoleOption {
  readonly id: string;
  readonly name: string;
  readonly color: number;
}

interface VerificationPanelFormProps {
  readonly guildId: string;
  readonly channels: readonly ChannelOption[];
  readonly roles: readonly RoleOption[];
  /**
   * When provided, the form is in "edit" mode. Channel + role are mutable
   * (unlike the panel form, which locks channel — but verification panels
   * have no tickets pinned to them, so a channel switch is cheap).
   */
  readonly initial?: {
    readonly panelId: string;
    readonly channelId: string;
    readonly roleId: string;
    readonly embedTitle: string;
    readonly embedDescription: string;
  };
}

const SESSION_KEY_PREFIX = 'verification-panel-form:';

const FormSchema = VerificationPanelInputSchema.extend({
  embedTitle: z.string().min(1, 'Title is required').max(256),
  embedDescription: z.string().min(1, 'Description is required').max(4000),
});
type FormValues = z.infer<typeof FormSchema>;

export function VerificationPanelForm({
  guildId,
  channels,
  roles,
  initial,
}: VerificationPanelFormProps): React.JSX.Element {
  const router = useRouter();
  const sessionKey = `${SESSION_KEY_PREFIX}${initial?.panelId ?? 'new'}`;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    mode: 'onChange',
    defaultValues: {
      guildId,
      channelId: initial?.channelId ?? '',
      roleId: initial?.roleId ?? '',
      embedTitle: initial?.embedTitle ?? 'Verification',
      embedDescription:
        initial?.embedDescription ??
        'Click the correct option below to receive your verification role.',
    },
  });

  const title = watch('embedTitle');
  const description = watch('embedDescription');
  const channelId = watch('channelId');
  const roleId = watch('roleId');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(sessionKey);
    if (stored === null) return;
    try {
      const parsed = JSON.parse(stored) as {
        channelId?: string;
        roleId?: string;
        title?: string;
        description?: string;
      };
      if (typeof parsed.channelId === 'string') {
        setValue('channelId', parsed.channelId, { shouldValidate: false });
      }
      if (typeof parsed.roleId === 'string') {
        setValue('roleId', parsed.roleId, { shouldValidate: false });
      }
      if (typeof parsed.title === 'string') {
        setValue('embedTitle', parsed.title, { shouldValidate: false });
      }
      if (typeof parsed.description === 'string') {
        setValue('embedDescription', parsed.description, { shouldValidate: false });
      }
    } catch {
      // Persisted state corrupted — start clean.
    }
  }, [sessionKey, setValue]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      sessionKey,
      JSON.stringify({ channelId, roleId, title, description }),
    );
  }, [sessionKey, channelId, roleId, title, description]);

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      const result =
        initial !== undefined
          ? await updateVerificationPanel({
              guildId,
              panelId: initial.panelId,
              channelId: values.channelId,
              roleId: values.roleId,
              embedTitle: values.embedTitle,
              embedDescription: values.embedDescription,
            })
          : await createVerificationPanel({
              guildId,
              input: {
                guildId,
                channelId: values.channelId,
                roleId: values.roleId,
                embedTitle: values.embedTitle,
                embedDescription: values.embedDescription,
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
        toast.warning(
          result.value.discordSyncMessage ??
            'Saved. Discord re-render queued — retry from the panel detail page.',
        );
      } else {
        toast.success(initial !== undefined ? 'Panel updated' : 'Panel created');
      }
      router.push(`/g/${guildId}/verification/${result.value.value.panelId}`);
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
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]"
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="verification-channel">Channel</Label>
          <Controller
            name="channelId"
            control={control}
            render={({ field }) => (
              <ChannelPicker
                id="verification-channel"
                channels={channels}
                value={field.value}
                onChange={field.onChange}
                placeholder="Pick a channel"
              />
            )}
          />
          {errors.channelId !== undefined ? (
            <p className="text-xs text-[color:var(--color-danger)]">{errors.channelId.message}</p>
          ) : (
            <p className="text-xs text-[color:var(--color-fg-muted)]">
              The verification message will be posted here. New users typically see it in a welcome
              / verify channel.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="verification-role">Role to grant</Label>
          <Controller
            name="roleId"
            control={control}
            render={({ field }) => (
              <RolePicker
                id="verification-role"
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
              Granted to a member who clicks the correct option. Make sure the bot&rsquo;s role is
              above this role in the server&rsquo;s role list, otherwise Discord will reject the
              assignment.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="verification-title">Embed title</Label>
          <Input
            id="verification-title"
            maxLength={256}
            aria-invalid={errors.embedTitle !== undefined}
            {...register('embedTitle')}
          />
          {errors.embedTitle !== undefined ? (
            <p className="text-xs text-[color:var(--color-danger)]">{errors.embedTitle.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="verification-description">Embed description</Label>
          <Textarea
            id="verification-description"
            maxLength={4000}
            aria-invalid={errors.embedDescription !== undefined}
            {...register('embedDescription')}
          />
          {errors.embedDescription !== undefined ? (
            <p className="text-xs text-[color:var(--color-danger)]">
              {errors.embedDescription.message}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : initial !== undefined ? 'Save changes' : 'Create panel'}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <VerificationPreview title={title} description={description} />
      </div>
    </form>
  );
}
