'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { setArchiveCategory, setLogChannel } from '@/actions/guild-config';
import { CategoryPicker } from '@/components/pickers/category-picker';
import { ChannelPicker } from '@/components/pickers/channel-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface Channel {
  readonly id: string;
  readonly name: string;
  readonly type: 'text' | 'announcement';
}
interface Category {
  readonly id: string;
  readonly name: string;
}

interface SettingsFormProps {
  readonly guildId: string;
  readonly channels: readonly Channel[];
  readonly categories: readonly Category[];
  readonly initial: {
    readonly archiveCategoryId: string | null;
    readonly alertChannelId: string | null;
  };
}

// Each sub-form holds a single snowflake-or-blank value. Empty string means
// "unset" — converted to null at submit time. This keeps the field
// controllable with a string default while still letting zod reject malformed
// snowflakes that aren't blank.
const SnowflakeOrEmpty = z
  .string()
  .refine(
    (v) => v === '' || /^\d{17,20}$/.test(v),
    'Discord snowflake must be 17–20 digits (or empty to unset)',
  );

const ArchiveCategorySchema = z.object({ archiveCategoryId: SnowflakeOrEmpty });
const LogChannelSchema = z.object({ alertChannelId: SnowflakeOrEmpty });

type ArchiveValues = z.infer<typeof ArchiveCategorySchema>;
type LogValues = z.infer<typeof LogChannelSchema>;

export function SettingsForm({
  guildId,
  channels,
  categories,
  initial,
}: SettingsFormProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <ArchiveCategoryCard
        guildId={guildId}
        categories={categories}
        defaultValue={initial.archiveCategoryId ?? ''}
      />
      <LogChannelCard
        guildId={guildId}
        channels={channels}
        defaultValue={initial.alertChannelId ?? ''}
      />
    </div>
  );
}

function ArchiveCategoryCard({
  guildId,
  categories,
  defaultValue,
}: {
  readonly guildId: string;
  readonly categories: readonly Category[];
  readonly defaultValue: string;
}): React.JSX.Element {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ArchiveValues>({
    resolver: zodResolver(ArchiveCategorySchema),
    mode: 'onChange',
    defaultValues: { archiveCategoryId: defaultValue },
  });

  async function onSubmit(values: ArchiveValues): Promise<void> {
    const result = await setArchiveCategory({
      guildId,
      categoryId: values.archiveCategoryId === '' ? null : values.archiveCategoryId,
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success('Archive category saved');
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Archive category</CardTitle>
          <CardDescription>
            Closed tickets are moved into this category — keeps the active categories tidy. Leave
            blank to skip the move on close.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="archive-category">Category</Label>
            <Controller
              name="archiveCategoryId"
              control={control}
              render={({ field }) => (
                <CategoryPicker
                  id="archive-category"
                  categories={categories}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="No archive category"
                />
              )}
            />
            {errors.archiveCategoryId !== undefined ? (
              <p className="text-xs text-[color:var(--color-danger)]">
                {errors.archiveCategoryId.message}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} size="sm">
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function LogChannelCard({
  guildId,
  channels,
  defaultValue,
}: {
  readonly guildId: string;
  readonly channels: readonly Channel[];
  readonly defaultValue: string;
}): React.JSX.Element {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LogValues>({
    resolver: zodResolver(LogChannelSchema),
    mode: 'onChange',
    defaultValues: { alertChannelId: defaultValue },
  });

  async function onSubmit(values: LogValues): Promise<void> {
    const result = await setLogChannel({
      guildId,
      channelId: values.alertChannelId === '' ? null : values.alertChannelId,
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success('Log channel saved');
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log channel</CardTitle>
          <CardDescription>
            Receives audit-log embeds when tickets are deleted. Optional — leave blank to skip
            modlog posts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="log-channel">Channel</Label>
            <Controller
              name="alertChannelId"
              control={control}
              render={({ field }) => (
                <ChannelPicker
                  id="log-channel"
                  channels={channels}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="No log channel"
                />
              )}
            />
            {errors.alertChannelId !== undefined ? (
              <p className="text-xs text-[color:var(--color-danger)]">
                {errors.alertChannelId.message}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} size="sm">
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
