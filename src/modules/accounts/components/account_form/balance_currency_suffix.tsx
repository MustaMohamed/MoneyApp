import { Typography } from 'heroui-native';
import React from 'react';
import { useWatch, type Control } from 'react-hook-form';

import { Type, lineHeightFor } from '@/constants/theme';

import type { AddAccountFormData } from '../../utils/add_account.schema';

export interface BalanceCurrencySuffixProps {
  control: Control<AddAccountFormData>;
}

/**
 * The balance input's inline currency suffix (`EGP` / `USD`, mockup C1's
 * `.sfx`) — its own component so its `useWatch('currency')` subscription
 * doesn't sit on `AccountForm` itself. Before this split, `AccountForm`
 * watched `currency` at its own root, so every segment tap re-rendered
 * `AccountForm` and everything under it — including the five-tile type
 * grid, which reads none of this — measured at 24 component renders, 5 of
 * them tiles, to repaint a three-character suffix (debt:perf #227 / MA-009
 * quality review Q1).
 *
 * A bare string throws "Text strings must be rendered within a <Text>
 * component" here — `InputGroup.Suffix` does not auto-wrap its children
 * (a real crash caught on the emulator during MA-009's own walk) — so the
 * `Typography` wrapper stays. Muted, not full-strength: this echoes the
 * currency segment selected one cell to the right, so it is genuinely
 * redundant copy (decision 8's carve-out), not something a user must read
 * here.
 */
export function BalanceCurrencySuffix({ control }: BalanceCurrencySuffixProps) {
  const currency = useWatch({ control, name: 'currency' });

  return (
    <Typography
      className="font-sora text-content-secondary"
      style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
    >
      {currency}
    </Typography>
  );
}
