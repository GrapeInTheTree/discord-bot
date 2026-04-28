'use client';

import { signInWithDiscord } from '@/actions/login';
import { Button } from '@/components/ui/button';

interface LoginButtonProps {
  readonly callbackUrl: string | undefined;
  readonly label: string;
}

export function LoginButton({ callbackUrl, label }: LoginButtonProps): React.JSX.Element {
  return (
    <form
      action={async () => {
        await signInWithDiscord(callbackUrl);
      }}
      className="w-full"
    >
      <Button type="submit" size="lg" className="w-full">
        {label}
      </Button>
    </form>
  );
}
