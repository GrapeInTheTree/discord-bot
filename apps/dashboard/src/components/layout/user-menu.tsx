'use client';

import { LogOut } from 'lucide-react';

import { signOutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { t } from '@/i18n';

interface UserMenuProps {
  readonly username: string;
  readonly avatarUrl: string | null;
}

export function UserMenu({ username, avatarUrl }: UserMenuProps): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`User menu for ${username}`}>
          {avatarUrl !== null ? (
            <img src={avatarUrl} alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
          ) : (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}
              aria-hidden="true"
            >
              {username.slice(0, 1).toUpperCase()}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <form action={signOutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t.app.signOut}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
