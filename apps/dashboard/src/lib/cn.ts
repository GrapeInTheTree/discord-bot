import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * `cn(...args)` — combine class strings with conflict-aware Tailwind merging.
 * shadcn/ui's standard helper. Conflicting utilities (e.g. `px-2` and `px-4`)
 * are reduced to the last one wins, after `clsx` has flattened conditionals.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
