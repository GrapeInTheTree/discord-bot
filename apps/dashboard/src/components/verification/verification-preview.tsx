'use client';

import { Check } from 'lucide-react';

interface VerificationPreviewProps {
  readonly title: string;
  readonly description: string;
  readonly footerText?: string | undefined;
  readonly options?: readonly {
    readonly id?: string;
    readonly label: string;
    readonly emoji: string | undefined;
    readonly style: 'primary' | 'secondary' | 'success' | 'danger';
    readonly position: number;
  }[];
  /** id of the option marked correct, if any. Renders a small ✓ badge on it. */
  readonly correctOptionId?: string | null | undefined;
}

const STYLE_TO_CLASS: Record<string, string> = {
  primary: 'bg-[#5865F2] text-white',
  secondary: 'bg-[#4F545C] text-white',
  success: 'bg-[#3BA55D] text-white',
  danger: 'bg-[#ED4245] text-white',
};

/**
 * Live Discord-embed preview for a verification panel. Same accent-bar
 * layout as PanelPreview so operators recognise it as a Discord embed
 * instantly, with up to 5 emoji buttons in a single row. The configured
 * "correct" option gets a small ✓ badge above it — admin-side hint only,
 * end users on Discord see no such marker.
 */
export function VerificationPreview({
  title,
  description,
  footerText,
  options = [],
  correctOptionId,
}: VerificationPreviewProps): React.JSX.Element {
  const accent = 'var(--color-accent)';
  const ordered = [...options].sort((a, b) => a.position - b.position);

  return (
    <div className="rounded-[var(--radius-lg)] border bg-[color:var(--color-bg-subtle)] p-4">
      <p className="mb-2 text-xs font-medium text-[color:var(--color-fg-muted)]">Preview</p>
      <div className="flex gap-3">
        <div
          className="w-1 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
        <div className="flex-1 space-y-2">
          {title !== '' ? (
            <p className="text-base font-semibold">{title}</p>
          ) : (
            <p className="text-base font-semibold text-[color:var(--color-fg-muted)] italic">
              (no title)
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm text-[color:var(--color-fg)]">
            {description !== '' ? (
              description
            ) : (
              <span className="italic text-[color:var(--color-fg-muted)]">(no description)</span>
            )}
          </p>
          {footerText !== undefined && footerText !== '' ? (
            <p className="text-xs text-[color:var(--color-fg-muted)]">{footerText}</p>
          ) : null}
          {ordered.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {ordered.map((b, i) => {
                const isCorrect =
                  correctOptionId !== null &&
                  correctOptionId !== undefined &&
                  b.id === correctOptionId;
                return (
                  <div key={b.id ?? i} className="flex flex-col items-start gap-1">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-accent)]">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Correct (admin view)
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium ${STYLE_TO_CLASS[b.style] ?? STYLE_TO_CLASS.primary}`}
                    >
                      {b.emoji !== undefined ? <span aria-hidden="true">{b.emoji}</span> : null}
                      <span>{b.label}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs italic text-[color:var(--color-fg-muted)] pt-2">
              No options yet — buttons appear here once you add options.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
