import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';

import { branding, brandColorCss } from '@/config/branding';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: branding.name,
  description: `${branding.name} dashboard — manage panels, ticket types, and tickets.`,
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html
      lang={branding.locale}
      className={`${inter.variable} ${jetBrainsMono.variable}`}
      // Inline style injects the operator's brand color into the design
      // token graph. Every component that needs the accent reads
      // `var(--color-accent)`; nothing else changes per deployment.
      style={{ '--color-accent': brandColorCss() } as React.CSSProperties}
    >
      <body className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
