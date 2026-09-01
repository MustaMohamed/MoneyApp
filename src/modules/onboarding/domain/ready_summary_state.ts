import { foreignCurrencyFor } from '@/constants/currency';
import type { Currency } from '@/constants/enums';
import { AccountType } from '@/constants/enums';
import { countForeignAccounts } from '@/modules/accounts/domain/account_aggregation';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { selectApproximationPill } from '@/modules/onboarding/domain/approximation_pill';
import {
  type StartingNetPosition,
  type StartingNetPositionInput,
  resolveStartingNetPosition,
  selectActiveAccounts,
} from '@/modules/onboarding/domain/starting_net_position';

/** The seven N4 display states, mockup frames F1-F7. F8 and F9 are completion states. */
export type ReadyFrame = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7';

/** Pill descriptors, not copy: the screen maps each one onto `Strings`. */
export type ReadyPill =
  | { kind: 'accounts'; count: number; glyph: 'bank-outline' | 'credit-card' }
  | { kind: 'opening-balances'; count: number }
  | { kind: 'needs-rate'; count: number }
  | { kind: 'rate'; rate: number }
  | { kind: 'approx'; currency: Currency; value: number };

export interface ReadySummaryState {
  outcome: StartingNetPosition;
  /** Drives the caption and the value slot. It does not drive the pills. */
  frame: ReadyFrame;
  /** Non-archived accounts; the count both pluralisation points switch on. */
  accountCount: number;
  foreignCount: number;
  /** The base currency chosen at N1, passed straight through from the input. */
  baseCurrency: Currency;
  /** The app has exactly two currencies, so an EGP base publishes USD and vice versa. */
  foreignCurrency: Currency;
  /** The currency-pill gate, independent of `frame`; the screen renders `pills`, not this flag. */
  pillsVisible: boolean;
  pills: readonly ReadyPill[];
}

/** Glyph keys off this, never the frame: F3 preempts F7 for a card-only set that needs a rate. */
function isCreditCardOnly(activeAccounts: readonly Account[]): boolean {
  return (
    activeAccounts.length >= 1 &&
    activeAccounts.every((account) => account.type === AccountType.CreditCard)
  );
}

/** Evaluation order is the contract: F3 precedes every `amount` frame, F7/F6 precede F4/F5/F1. */
function resolveFrame(
  outcome: StartingNetPosition,
  activeAccounts: readonly Account[],
  foreignCount: number,
  creditCardOnly: boolean,
): ReadyFrame {
  if (outcome.kind === 'rate-needed') {
    return 'F3';
  }
  if (creditCardOnly) {
    return 'F7';
  }
  if (activeAccounts.length === 1) {
    return 'F6';
  }
  if (outcome.value === 0) {
    return 'F5';
  }
  if (outcome.value < 0) {
    return 'F4';
  }
  return foreignCount >= 1 ? 'F2' : 'F1';
}

/** Pills key off the gate, never the frame; currency pills replace the opening-balances pill. */
export function selectReadySummaryState(input: StartingNetPositionInput): ReadySummaryState {
  const outcome = resolveStartingNetPosition(input);
  const activeAccounts = selectActiveAccounts(input.accounts);
  const accountCount = activeAccounts.length;
  const foreignCount = countForeignAccounts(activeAccounts, input.baseCurrency);
  const foreignCurrency = foreignCurrencyFor(input.baseCurrency);
  const creditCardOnly = isCreditCardOnly(activeAccounts);
  const frame = resolveFrame(outcome, activeAccounts, foreignCount, creditCardOnly);

  // `outcome` is handed over, not re-resolved: the pill is the hero value in the other currency.
  const { ratePill, approxPill } = selectApproximationPill(input, outcome);
  const currencyPills: readonly ReadyPill[] | undefined =
    ratePill !== undefined && approxPill !== undefined
      ? [
          { kind: 'rate', rate: ratePill.rate },
          { kind: 'approx', currency: approxPill.currency, value: approxPill.value },
        ]
      : undefined;

  const accountsPill: ReadyPill = {
    kind: 'accounts',
    count: accountCount,
    // The account composition, never the frame; see `isCreditCardOnly`.
    glyph: creditCardOnly ? 'credit-card' : 'bank-outline',
  };

  const pills: readonly ReadyPill[] =
    outcome.kind === 'rate-needed'
      ? // The refusal counts the accounts that need a rate, not all of them.
        [accountsPill, { kind: 'needs-rate', count: foreignCount }]
      : currencyPills !== undefined
        ? [accountsPill, ...currencyPills]
        : [accountsPill, { kind: 'opening-balances', count: accountCount }];

  return {
    outcome,
    frame,
    accountCount,
    foreignCount,
    baseCurrency: input.baseCurrency,
    foreignCurrency,
    pillsVisible: currencyPills !== undefined,
    pills,
  };
}
