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

/** The seven N4 display states, mockup frames F1-F7. F8 and F9 are completion states, not frames. */
export type ReadyFrame = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7';

/**
 * Pill DESCRIPTORS, not copy: the screen maps each one onto `Strings`. Keeping
 * the strings out is what keeps this file free of the copy block, and it is
 * what the scope spec asks for — the caption and the pills are copy, the choice
 * between them is logic.
 */
export type ReadyPill =
  | { kind: 'accounts'; count: number; glyph: 'bank-outline' | 'credit-card' }
  | { kind: 'opening-balances'; count: number }
  | { kind: 'needs-rate'; count: number }
  | { kind: 'rate'; rate: number }
  | { kind: 'approx'; currency: Currency; value: number };

export interface ReadySummaryState {
  outcome: StartingNetPosition;
  /** Drives the CAPTION and the value slot. It does not drive the pills. */
  frame: ReadyFrame;
  /** Non-archived accounts — the count both pluralisation points switch on. */
  accountCount: number;
  foreignCount: number;
  /**
   * The currency-pill gate, INDEPENDENT of `frame`. Exported because it is the
   * one flag that explains the composed `pills` array — it is the assertable
   * form of "the currency pills replaced the opening-balances pill", and a
   * regression to frame-keyed pills shows up here first. The screen renders
   * `pills` and never branches on this flag.
   */
  pillsVisible: boolean;
  pills: readonly ReadyPill[];
}

/**
 * The all-credit-card fact, hoisted out of `resolveFrame` because the accounts
 * pill's glyph needs the SAME expression. Keyed off it and never off the frame:
 * F3 is returned before F7 is even tested, so a credit-card-only set that also
 * needs a rate is on F3 while still being all credit cards — glyph logic that
 * reads `frame === 'F7'` renders a bank outline over it.
 */
function isCreditCardOnly(activeAccounts: readonly Account[]): boolean {
  return (
    activeAccounts.length >= 1 &&
    activeAccounts.every((account) => account.type === AccountType.CreditCard)
  );
}

/**
 * Frame selection, in evaluation order. The order is the contract: F3 precedes
 * every `amount` frame, and F7/F6 precede F4/F5/F1 so a single credit card
 * lands on F7 rather than F4.
 */
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

/**
 * The whole N4 view model: the resolver's outcome, the frame, the two counts and
 * the composed pill row.
 *
 * Pill composition is keyed off the GATE, never off the frame. Frame selection
 * evaluates F7/F6/F5/F4 before F2, so keying pills by frame silently drops the
 * currency pills for any negative, zero, single-account or all-credit-card set
 * that also has a foreign account — rows P7 and P9 of the pill table. In every
 * `amount` frame the currency pills REPLACE the opening-balances pill; they
 * never merely add to it.
 */
export function selectReadySummaryState(input: StartingNetPositionInput): ReadySummaryState {
  const outcome = resolveStartingNetPosition(input);
  const activeAccounts = selectActiveAccounts(input.accounts);
  const accountCount = activeAccounts.length;
  const foreignCount = countForeignAccounts(activeAccounts, input.baseCurrency);
  const creditCardOnly = isCreditCardOnly(activeAccounts);
  const frame = resolveFrame(outcome, activeAccounts, foreignCount, creditCardOnly);

  // The gate — `outcome.kind === 'amount' && foreignCount >= 1` — is evaluated
  // once, inside `selectApproximationPill`, which returns both pills or neither.
  // `outcome` is handed over rather than re-resolved: the pill IS the hero value
  // in the other currency, so the two must come from one resolve, not two that
  // happen to agree.
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
    // The account COMPOSITION, never the frame — see `isCreditCardOnly`.
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
    pillsVisible: currencyPills !== undefined,
    pills,
  };
}
