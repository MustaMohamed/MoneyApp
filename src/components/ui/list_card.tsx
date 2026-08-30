import { ListGroup } from 'heroui-native';
import type { ReactNode } from 'react';

import { Radius, Size } from '@/constants/theme';

export interface ListCardProps {
  children: ReactNode;
}

/**
 * The Surface trap (§5.2), invisible to every CI check. `ListGroup` is
 * Surface-based and `.surface__root` resolves to `p-4 rounded-3xl
 * shadow-surface overflow-hidden` with no border, ever — so the border, the
 * radius and `p-0` are each required. `shadow-none` loses to the custom
 * `--surface-shadow` token; the `elevation`/`shadowOpacity` pair does not
 * beat it either, because uniwind keys that token as `boxShadow`, a separate
 * RN pipeline. HeroUI declares `--surface-shadow` itself — a real shadow in
 * light (`variables.css:80`), transparent in dark (`:146`) — and this
 * project never overrides it, so with `userInterfaceStyle: "automatic"`
 * (`app.json:8`) an OS-light device paints that real light shadow —
 * `boxShadow: 'none'` is the deterministic both-variant kill, device-proven.
 */
export function ListCard({ children }: ListCardProps) {
  return (
    <ListGroup
      className="border-separator p-0"
      style={{ borderWidth: Size.hairline, borderRadius: Radius.lg, boxShadow: 'none' }}
    >
      {children}
    </ListGroup>
  );
}
