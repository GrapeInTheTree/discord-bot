'use client';

import { ChevronDown } from 'lucide-react';
import * as React from 'react';

interface Role {
  readonly id: string;
  readonly name: string;
  readonly color: number;
}

interface RolePickerProps {
  readonly roles: readonly Role[];
  readonly value: string;
  readonly onChange: (id: string) => void;
  readonly placeholder?: string;
  readonly id?: string;
}

/**
 * Single-role native <select>. Mirrors ChannelPicker shape for visual
 * consistency. Used by the verification panel form for the "role to grant
 * on success" field, where multi-select doesn't apply.
 *
 * Bot-managed roles (e.g. integration roles) aren't filtered out here —
 * the operator may want them surfaced for transparency. The backend
 * surfaces a 50013 outcome ('role_assign_failed') if Discord rejects the
 * assign at runtime.
 */
export function RolePicker({
  roles,
  value,
  onChange,
  placeholder = 'Select a role',
  id,
}: RolePickerProps): React.JSX.Element {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="flex h-9 w-full appearance-none rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 pr-8 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
      >
        <option value="">{placeholder}</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            @{r.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-fg-muted)]"
        aria-hidden="true"
      />
    </div>
  );
}
