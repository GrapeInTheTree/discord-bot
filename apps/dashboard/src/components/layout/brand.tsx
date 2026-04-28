import Link from 'next/link';

import { branding } from '@/config/branding';
import { cn } from '@/lib/cn';

interface BrandProps {
  readonly href?: string;
  readonly className?: string;
}

/**
 * Brand mark — bot icon (or accent dot fallback) + name. Renders the
 * single moment of color in the otherwise restrained chrome. Acts as the
 * sidebar's home link.
 */
export function Brand({ href = '/', className }: BrandProps): React.JSX.Element {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 text-[color:var(--color-fg)] transition-opacity hover:opacity-80',
        className,
      )}
    >
      {branding.iconUrl !== undefined ? (
        <img
          src={branding.iconUrl}
          alt={branding.name}
          width={24}
          height={24}
          className="h-6 w-6 rounded-[var(--radius-sm)]"
        />
      ) : (
        <span
          className="h-6 w-6 rounded-[var(--radius-sm)]"
          style={{ backgroundColor: 'var(--color-accent)' }}
          aria-hidden="true"
        />
      )}
      <span className="font-semibold tracking-tight">{branding.name}</span>
    </Link>
  );
}
