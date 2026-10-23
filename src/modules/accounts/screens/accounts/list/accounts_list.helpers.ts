import { ACCOUNT_TYPE_LABELS } from '@/constants/account_type_labels';
import { AccountType, type Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { AccountStats } from '@/modules/accounts/database/account_stats';
import { buildInfoRows, type InfoRowKind } from '@/modules/accounts/utils/account_info_rows';
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

  // The over-limit state carries no bare amount, so it reaches the caption through `value`.
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
      const inBase = byKind.get('inBase')?.value;
      return inBase === undefined
        ? join(Strings.accountCaptionBank, 'monthIn', 'monthOut')
        : Strings.accountCaptionSmartWallet(inBase, formatRateDisplayMagnitude(rate).text);
    }
    case AccountType.Bank:
      return join(Strings.accountCaptionBank, 'monthIn', 'monthOut');
    // A sixth account type has to be given a caption here, not silently take the type label.
    default: {
      const unreachable: never = account.type;
      return ACCOUNT_TYPE_LABELS[unreachable];
    }
  }
}

/** A selection over the card's rows; this file converts, rounds and formats nothing (ADR 2026-09-07). */
export function resolveAccountCaption(input: AccountCaptionInput): string {
  // Unreachable by construction: every branch reads only kinds its own account type emits.
  return composeCaption(input) ?? ACCOUNT_TYPE_LABELS[input.account.type];
}

const CAPTION_SEPARATOR = '·';
const CAPTION_AMOUNT = /\d/;
const CAPTION_CODE = /^[A-Z]{3}$/;
const CAPTION_PREFIX = /^[≈\u2212]$/;

/** A caption's words split on U+0020 into units that wrap whole: an amount keeps its leading `≈` or sign and its currency code, and a `·` joins the unit before it; each unit but the last keeps its trailing space. */
export function splitCaptionUnits(caption: string): string[] {
  const words = caption.split(' ').filter((word) => word !== '');
  const units: string[][] = [];
  words.forEach((word, index) => {
    const previous = index > 0 ? words[index - 1] : undefined;
    const joins =
      previous !== undefined &&
      (word === CAPTION_SEPARATOR ||
        (CAPTION_CODE.test(word) && CAPTION_AMOUNT.test(previous)) ||
        (CAPTION_AMOUNT.test(word) && CAPTION_PREFIX.test(previous)));
    const last = units.at(-1);
    if (joins && last !== undefined) last.push(word);
    else units.push([word]);
  });
  return units.map((unit, index) => `${unit.join(' ')}${index < units.length - 1 ? ' ' : ''}`);
}
