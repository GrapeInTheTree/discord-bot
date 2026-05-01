import { describe, expect, it } from 'vitest';

import { renderDiscordMarkdown } from '@/components/panels/welcome-preview';

// `renderDiscordMarkdown` is the small Discord-Markdown-to-HTML renderer
// powering the welcome-message preview. The first ship missed heading
// support — operator typed `## Your Ticket` and saw the `##` literal in
// the preview. These tests pin every supported token so a regression
// surfaces here, not in the operator's screen.

describe('renderDiscordMarkdown', () => {
  it('escapes HTML so operator input cannot inject tags', () => {
    expect(renderDiscordMarkdown('<script>alert(1)</script>')).toContain('&lt;script&gt;');
  });

  it('renders bold', () => {
    expect(renderDiscordMarkdown('**hi**')).toBe('<strong>hi</strong>');
  });

  it('renders italic with single asterisk', () => {
    expect(renderDiscordMarkdown('*hi*')).toBe('<em>hi</em>');
  });

  it('renders italic with single underscore', () => {
    expect(renderDiscordMarkdown('_hi_')).toBe('<em>hi</em>');
  });

  it('renders underline', () => {
    expect(renderDiscordMarkdown('__hi__')).toBe('<u>hi</u>');
  });

  it('renders strikethrough', () => {
    expect(renderDiscordMarkdown('~~hi~~')).toBe('<del>hi</del>');
  });

  it('renders inline code', () => {
    expect(renderDiscordMarkdown('`hi`')).toBe('<code>hi</code>');
  });

  it('renders fenced code blocks', () => {
    expect(renderDiscordMarkdown('```a\nb```')).toContain('<pre><code>');
  });

  it('renders headings — h1, h2, h3', () => {
    expect(renderDiscordMarkdown('# Title')).toContain('<h1');
    expect(renderDiscordMarkdown('# Title')).toContain('Title</h1>');
    expect(renderDiscordMarkdown('## Sub')).toContain('<h2');
    expect(renderDiscordMarkdown('### Tiny')).toContain('<h3');
  });

  it('renders heading at start of multi-line input + body underneath', () => {
    const html = renderDiscordMarkdown('## Your Ticket\nbody');
    expect(html).toContain('<h2');
    expect(html).toContain('Your Ticket</h2>');
    expect(html).toContain('body');
    // No literal `## ` or stray hash should leak through.
    expect(html).not.toMatch(/^##\s/);
  });

  it('does not render headings in fenced code blocks', () => {
    const html = renderDiscordMarkdown('```\n## inside code\n```');
    expect(html).toContain('## inside code');
    expect(html).not.toContain('<h2');
  });

  it('renders block quotes', () => {
    expect(renderDiscordMarkdown('> quoted')).toContain('<blockquote');
  });

  it('renders http(s) links and rejects javascript: links', () => {
    const safe = renderDiscordMarkdown('[click](https://example.com)');
    expect(safe).toContain('href="https://example.com"');
    expect(safe).toContain('rel="noreferrer noopener"');
    const evil = renderDiscordMarkdown('[click](javascript:alert(1))');
    // The link regex requires http(s); the malicious payload survives as
    // escaped plain text rather than becoming an `<a>` tag.
    expect(evil).not.toContain('<a');
    expect(evil).toContain('javascript:alert(1)');
  });

  it('converts plain newlines to <br>', () => {
    expect(renderDiscordMarkdown('a\nb')).toBe('a<br>b');
  });

  it('does not double-break after headings', () => {
    // The newline-collapse step keeps `</h2>body` tight rather than
    // `</h2><br>body` which would visually duplicate the heading margin.
    expect(renderDiscordMarkdown('## Title\nbody')).toContain('Title</h2>body');
  });
});
