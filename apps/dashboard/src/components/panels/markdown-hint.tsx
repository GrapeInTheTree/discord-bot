import * as React from 'react';

interface MarkdownHintProps {
  /** When `limited`, shows the smaller subset Discord renders inside
   *  embed titles (no headings/lists). `full` covers the description /
   *  welcome-message subset (bold/italic/code/links/quotes/lists). */
  readonly variant: 'full' | 'limited';
}

/**
 * Tiny inline reminder that the field accepts Discord Markdown. Sits
 * under the input as helper text. Not a popover — it's the kind of
 * thing operators forget exists if hidden behind a click. Examples
 * are rendered as <code> so they're scannable.
 *
 * Discord Markdown reference (subset we support in the WelcomePreview
 * renderer): https://support.discord.com/hc/en-us/articles/210298617
 */
export function MarkdownHint({ variant }: MarkdownHintProps): React.JSX.Element {
  if (variant === 'limited') {
    return (
      <p className="text-xs text-[color:var(--color-fg-muted)]">
        Discord Markdown supported: <code className="font-mono">**bold**</code>,{' '}
        <code className="font-mono">*italic*</code>, <code className="font-mono">`code`</code>,{' '}
        <code className="font-mono">[link](https://…)</code>.
      </p>
    );
  }
  return (
    <p className="text-xs text-[color:var(--color-fg-muted)]">
      Discord Markdown supported: <code className="font-mono">**bold**</code>,{' '}
      <code className="font-mono">*italic*</code>, <code className="font-mono">__underline__</code>,{' '}
      <code className="font-mono">~~strike~~</code>, <code className="font-mono">`code`</code>,{' '}
      <code className="font-mono">```block```</code>,{' '}
      <code className="font-mono">[link](https://…)</code>,{' '}
      <code className="font-mono">&gt; quote</code>, <code className="font-mono"># H1</code> /{' '}
      <code className="font-mono">## H2</code> / <code className="font-mono">### H3</code>. Use real
      line breaks for paragraph spacing.
    </p>
  );
}
