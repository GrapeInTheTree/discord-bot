'use client';

import { PanelInputSchema } from '@hearth/tickets-core/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { createPanel, updatePanel } from '@/actions/panels';
import { MarkdownHint } from '@/components/panels/markdown-hint';
import { PanelPreview } from '@/components/panels/panel-preview';
import { ChannelPicker } from '@/components/pickers/channel-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ChannelOption {
  readonly id: string;
  readonly name: string;
  readonly type: 'text' | 'announcement';
}

interface PanelFormProps {
  readonly guildId: string;
  readonly channels: readonly ChannelOption[];
  /**
   * When provided, the form is in "edit" mode: channelId is locked, only
   * embed title/description are mutable. Edit goes through updatePanel.
   */
  readonly initial?: {
    readonly panelId: string;
    readonly channelId: string;
    readonly embedTitle: string;
    readonly embedDescription: string;
  };
}

const SESSION_KEY_PREFIX = 'panel-form:';

// Form values mirror PanelInputSchema, but the form treats title/description
// as required strings (defaulted to non-empty starter copy) so the live
// preview never has to handle `undefined`. We strip empties at submit time
// to satisfy the optional-typed action signature.
const FormSchema = PanelInputSchema.extend({
  embedTitle: z.string().min(1, 'Title is required').max(256),
  embedDescription: z.string().min(1, 'Description is required').max(4000),
});
type FormValues = z.infer<typeof FormSchema>;

export function PanelForm({ guildId, channels, initial }: PanelFormProps): React.JSX.Element {
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
      embedTitle: initial?.embedTitle ?? 'Contact Team',
      embedDescription: initial?.embedDescription ?? 'Click a button below to open a ticket.',
    },
  });

  // Live preview values — useWatch with watch() keeps the right column
  // in sync per keystroke without re-rendering the entire form tree.
  const title = watch('embedTitle');
  const description = watch('embedDescription');
  const channelId = watch('channelId');

  // Hydrate from sessionStorage once on mount.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(sessionKey);
    if (stored === null) return;
    try {
      const parsed = JSON.parse(stored) as {
        channelId?: string;
        title?: string;
        description?: string;
      };
      if (typeof parsed.channelId === 'string') {
        setValue('channelId', parsed.channelId, { shouldValidate: false });
      }
      if (typeof parsed.title === 'string') {
        setValue('embedTitle', parsed.title, { shouldValidate: false });
      }
      if (typeof parsed.description === 'string') {
        setValue('embedDescription', parsed.description, { shouldValidate: false });
      }
    } catch {
      // Ignore — persisted state corrupted; start clean.
    }
  }, [sessionKey, setValue]);

  // Persist on every change.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(sessionKey, JSON.stringify({ channelId, title, description }));
  }, [sessionKey, channelId, title, description]);

  async function onSubmit(values: FormValues): Promise<void> {
    try {
      const result =
        initial !== undefined
          ? await updatePanel({
              guildId,
              panelId: initial.panelId,
              embedTitle: values.embedTitle,
              embedDescription: values.embedDescription,
            })
          : await createPanel({
              guildId,
              input: {
                guildId,
                channelId: values.channelId,
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
        toast.warning('Saved. Discord re-render queued — retry from the panel detail page.');
      } else {
        toast.success(initial !== undefined ? 'Panel updated' : 'Panel created');
      }
      router.push(`/g/${guildId}/panels/${result.value.value.panelId}`);
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
        {initial === undefined ? (
          <div className="grid gap-2">
            <Label htmlFor="panel-channel">Channel</Label>
            <Controller
              name="channelId"
              control={control}
              render={({ field }) => (
                <ChannelPicker
                  id="panel-channel"
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
                Where the panel message will be posted. Operators usually pick a public-facing
                channel like <span className="font-mono">#contact-team</span>.
              </p>
            )}
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="panel-title">Embed title</Label>
          <Input
            id="panel-title"
            maxLength={256}
            aria-invalid={errors.embedTitle !== undefined}
            {...register('embedTitle')}
          />
          {errors.embedTitle !== undefined ? (
            <p className="text-xs text-[color:var(--color-danger)]">{errors.embedTitle.message}</p>
          ) : (
            <MarkdownHint variant="limited" />
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="panel-description">Embed description</Label>
          <Textarea
            id="panel-description"
            maxLength={4000}
            aria-invalid={errors.embedDescription !== undefined}
            {...register('embedDescription')}
          />
          {errors.embedDescription !== undefined ? (
            <p className="text-xs text-[color:var(--color-danger)]">
              {errors.embedDescription.message}
            </p>
          ) : (
            <MarkdownHint variant="full" />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : initial !== undefined ? 'Save changes' : 'Create panel'}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <PanelPreview title={title} description={description} />
      </div>
    </form>
  );
}
