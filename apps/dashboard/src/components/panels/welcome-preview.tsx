'use client';

import * as React from 'react';

interface WelcomePreviewProps {
  /** Body text — falls back to the default copy when blank. */
  readonly body: string;
  /** Same env-injected branding as PanelPreview's accent bar. */
  readonly footerText?: string | undefined;
  /** Default fallback shown when `body` is empty (mirrors
   *  i18n.tickets.welcome.default). Passed in to keep this component
   *  free of any tickets-core import — server-injected like
   *  PanelPreview's accent. */
  readonly defaultBody: string;
}

/**
 * Live Discord-embed preview for the welcome message a ticket type
 * would post in a freshly-opened ticket channel. Mirrors the panel
 * preview's left-accent-bar layout so operators recognise it as a
 * Discord embed at a glance. Renders a small subset of Discord
 * markdown so what they see in the textarea matches what users will
 * see in the channel.
 *
 * Buttons under the embed are the open-state pair the bot actually
 * posts — Close + Delete (claim/reopen flow through slash commands).
 */
export function WelcomePreview({
  body,
  footerText,
  defaultBody,
}: WelcomePreviewProps): React.JSX.Element {
  const accent = 'var(--color-accent)';
  const effective = body.trim() === '' ? defaultBody : body;
  return (
    <div className="rounded-[var(--radius-lg)] border bg-[color:var(--color-bg-subtle)] p-4">
      <p className="mb-2 text-xs font-medium text-[color:var(--color-fg-muted)]">
        Welcome message preview
      </p>
      <div className="flex gap-3">
        <div
          className="w-1 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        />
        <div className="flex-1 space-y-2">
          <div
            className="whitespace-pre-wrap text-sm text-[color:var(--color-fg)]"
            // Markdown is rendered to a small inline subset (bold, italic,
            // code, links, line breaks). Source string is operator input,
            // so the renderer escapes everything before substituting tags
            // — see renderDiscordMarkdown below.
            dangerouslySetInnerHTML={{ __html: renderDiscordMarkdown(effective) }}
          />
          {footerText !== undefined && footerText !== '' ? (
            <p className="text-xs text-[color:var(--color-fg-muted)]">{footerText}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[#4F545C] px-3 py-1.5 text-xs font-medium text-white">
              <span aria-hidden="true">🔒</span>
              <span>Close</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[#ED4245] px-3 py-1.5 text-xs font-medium text-white">
              <span aria-hidden="true">🗑️</span>
              <span>Delete</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Markdown renderer ────────────────────────────────────────────────
// Discord supports a Markdown-ish subset. We render the most common bits
// here so the preview meaningfully reflects channel rendering. Anything
// not handled falls through as plain text. Order matters: code spans
// before bold/italic so backticks don't get nested-formatted.

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c] ?? c);
}

/**
 * Render a small Discord Markdown subset to safe HTML. Operator input
 * goes through `escapeHtml` first; only specific token patterns are
 * substituted with tags afterward, so script/style/onerror style
 * injection has no opening.
 *
 * Supported:
 *   `code`            → <code>code</code>
 *   ```code block```  → <pre><code>...</code></pre>
 *   **bold**          → <strong>bold</strong>
 *   __underline__     → <u>underline</u>
 *   *italic*          → <em>italic</em>
 *   _italic_          → <em>italic</em>
 *   ~~strike~~        → <del>strike</del>
 *   [text](https://x) → <a href="...">text</a>
 *   > quote           → <blockquote>quote</blockquote>
 *   newlines          → <br>
 */
export function renderDiscordMarkdown(input: string): string {
  let s = escapeHtml(input);

  // Triple-backtick code blocks first — multiline.
  s = s.replace(/```([\s\S]*?)```/g, (_, code: string) => `<pre><code>${code}</code></pre>`);
  // Inline code — single backticks. Avoids matching the now-rendered <pre>.
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // Bold (must precede italic so `**a**` doesn't become `<em>*a*</em>`).
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  // Underline.
  s = s.replace(/__([^_\n]+?)__/g, '<u>$1</u>');
  // Italic — single asterisk or underscore.
  s = s.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  s = s.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>');
  // Strikethrough.
  s = s.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>');
  // Links — escapeHtml has already neutralised the URL; we only allow
  // http(s) so a `javascript:` payload can't ride in.
  s = s.replace(
    /\[([^\]\n]+?)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, text: string, url: string) =>
      `<a href="${url}" target="_blank" rel="noreferrer noopener" class="underline">${text}</a>`,
  );
  // Block quotes — leading "&gt; " (the escaped form of "> ").
  s = s.replace(
    /(^|<br>)&gt; ([^<]*)/g,
    (_, lead: string, text: string) =>
      `${lead}<blockquote class="pl-2 border-l-2 opacity-80">${text}</blockquote>`,
  );
  // Newlines last.
  s = s.replace(/\n/g, '<br>');
  return s;
}
