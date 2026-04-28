import { UserMenu } from '@/components/layout/user-menu';

interface TopbarProps {
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly title?: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
}

/**
 * Page header — server component. Title + description on the left, an
 * optional primary action and the user menu on the right.
 */
export function Topbar({
  username,
  avatarUrl,
  title,
  description,
  action,
}: TopbarProps): React.JSX.Element {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-[color:var(--color-bg)] px-8">
      <div className="flex flex-col">
        {title !== undefined ? (
          <h1 className="text-base font-semibold leading-tight tracking-tight">{title}</h1>
        ) : null}
        {description !== undefined ? (
          <p className="text-xs text-[color:var(--color-fg-muted)]">{description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <UserMenu username={username} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
