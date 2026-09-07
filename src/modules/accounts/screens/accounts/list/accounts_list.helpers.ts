import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { AccountType, type Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import {
  buildInfoRows,
  type InfoRowKind,
} from '@/modules/dashboard/screens/dashboard/components/account_card';
import { formatRateDisplayMagnitude } from '@/utils/format_amount';

import type { Account } from '../../../entities/account.entity';

type AccountsListContentInput = {
  loadError: boolean;
  accountCount: number;
};

type AccountsListContent = 'error' | 'empty' | 'rows';

export function resolveAccountsListContent({
  loadError,
  accountCount,
}: AccountsListContentInput): AccountsListContent {
  if (loadError) return 'error';
  return accountCount === 0 ? 'empty' : 'rows';
}

interface AccountCaptionInput {
  account: Account;
  rate: number;
  stats: AccountStats | undefined;
  isRateUsable: boolean;
  baseCurrency: Currency;
}

function composeCaption({
  account,
  rate,
  stats,
  isRateUsable,
  baseCurrency,
}: AccountCaptionInput): string | undefined {
  const rows = buildInfoRows(account, rate, stats, isRateUsable, baseCurrency);
  const byKind = new Map(rows.map((row) => [row.kind, row] as const));

  // Over Limit carries no bare amount, so it reaches the caption through `value`.
  const text = (kind: InfoRowKind): string | undefined => {
    const row = byKind.get(kind);
    return row === undefined ? undefined : (row.amountText ?? row.value);
  };

  const join = (
    template: (first: string, second: string) => string,
    firstKind: InfoRowKind,
    secondKind: InfoRowKind,
  ): string | undefined => {
    const first = text(firstKind);
    const second = text(secondKind);
    return first === undefined || second === undefined ? undefined : template(first, second);
  };

  switch (account.type) {
    case AccountType.CreditCard:
      return join(Strings.accountCaptionCard, 'limit', 'available');
    case AccountType.PhysicalWallet:
      return join(Strings.accountCaptionCash, 'monthSpend', 'weekSpend');
    case AccountType.PhysicalSavings:
      return join(Strings.accountCaptionSavings, 'monthStart', 'change');
    case AccountType.SmartWallet: {
      // `formatRateDisplayMagnitude` throws on a non-positive rate; only a usable rate emits `inBase`.
      const inBase = text('inBase');
      return inBase === undefined
        ? join(Strings.accountCaptionBank, 'monthIn', 'monthOut')
        : Strings.accountCaptionSmartWallet(
            inBase,
            CURRENCY_CONFIG[baseCurrency].code,
            formatRateDisplayMagnitude(rate).text,
          );
    }
    case AccountType.Bank:
      return join(Strings.accountCaptionBank, 'monthIn', 'monthOut');
  }
}

/** A selection over the card's rows; this file converts, rounds and formats nothing (ADR 2026-09-07). */
export function resolveAccountCaption(input: AccountCaptionInput): string {
  // Unreachable by construction: every branch reads only kinds its own account type emits.
  return composeCaption(input) ?? ACCOUNT_TYPE_LABELS[input.account.type];
}
