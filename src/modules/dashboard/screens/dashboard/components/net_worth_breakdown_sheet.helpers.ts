import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatCurrencyAmount } from '@/utils/format_amount';

/**
 * Exported for `__tests__/screens/dashboard/net_worth_breakdown_sheet.helpers.test.ts` —
 * net_worth_breakdown_sheet.tsx:164 was inline JSX with no test seam.
 *
 * Keyed on the FIELD being absent, not on `rate > 0`: `INITIAL_STATE.rate` is 50, so the old
 * check printed a confident `≈ N USD` computed from the placeholder for every user who had
 * never fetched a rate. No `?? 0` — `formatAmount(0)` renders `≈ 0.00 USD`, a wrong number
 * rather than an absent one.
 */
export function resolveNetWorthUsdCaption(netWorthUsd: number | undefined): string {
  return netWorthUsd === undefined
    ? Strings.netWorthBreakdownUsdUnavailable
    : Strings.netWorthBreakdownUsdApprox(formatCurrencyAmount(netWorthUsd, Currency.USD));
}

/**
 * The bar segment / legend dot / legend icon colour for a breakdown row, by
 * kind — categorical, identifying which group a row belongs to, never a
 * judgement on the row's balance (docs/adr/2026-08-27-money-colour-vocabulary.md).
 * `value` is `undefined` for every kind: a liability's magnitude is money the
 * user owes, not an actionable state, so it takes no colour and falls to
 * `LegendRow`'s default `text-foreground` — its composed `−` sign is what
 * carries the polarity. Liquid and reserve route through here too, alongside
 * liability, so a future kind can't reintroduce a value colour by omission.
 */
export function resolveBreakdownRowColors(kind: 'liquid' | 'reserve' | 'liability'): {
  legend: string;
  value: string | undefined;
} {
  const legend =
    kind === 'liquid'
      ? Colors.dark.positive
      : kind === 'reserve'
        ? Colors.dark.gold
        : Colors.dark.negative;

  return { legend, value: undefined };
}
