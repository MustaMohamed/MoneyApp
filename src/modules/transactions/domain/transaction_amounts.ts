import { Currency, TransactionType } from '@/constants/enums';
import { roundMoney } from '@/utils/money';

export interface TransactionAmounts {
  amount: number;
  egpAmount: number;
  toAmount: number | null;
  exchangeRate: number | null;
}

export interface CommitmentPaymentAmounts {
  paymentAmount: number;
  accountNativeAmount: number;
  accountCurrency: Currency;
  egpAmount: number;
  exchangeRate: number | null;
}

/** True when either side is USD. `(USD, undefined)` is true, so callers own presence checks. */
export function requiresExchangeRate(a: Currency | undefined, b?: Currency): boolean {
  return a === Currency.USD || b === Currency.USD;
}

/** Transfer and CCPayment carry a destination leg; every caller shares this gate. */
export function requiresDestination(type: TransactionType): boolean {
  return type === TransactionType.Transfer || type === TransactionType.CCPayment;
}

/**
 * Two throws set `reason`: `'unstorable'` (amount out of the storable range) and
 * `'zero-destination'` (the destination leg rounds to 0 while the source is positive —
 * ruling on #363). `resolveTransactionSaveError`, `resolveDestinationFloorError`, and
 * `resolvePaySheetSaveError` are its readers.
 */
export class TransactionAmountError extends Error {
  constructor(
    message: string,
    readonly reason?: 'unstorable' | 'zero-destination',
  ) {
    super(message);
    this.name = 'TransactionAmountError';
  }
}

// Nothing non-finite or above `MAX_SAFE_INTEGER` reaches SQLite; the bound itself is storable.
function assertStorable(value: number): void {
  if (!Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER) {
    throw new TransactionAmountError('Computed amount exceeds the storable range', 'unstorable');
  }
}

/**
 * `assertStorable` over every money leg of a resolver's return, applied at
 * that resolver's single exit. The type constraint is the mechanism: a field
 * that is not `number | null` — a currency code, an optional — fails to
 * compile inside the literal, so the guarded set is structural rather than a
 * hand-maintained list of names, and a leg added inside the literal is
 * guarded with no change here.
 *
 * The spread puts the guarded legs first, which reorders the keys of the
 * object `resolveCommitmentPaymentAmounts` returns: `accountCurrency` lands
 * fourth, behind the three guarded legs, where the hand-written literal it
 * replaced had it third. So no consumer of either return may read it
 * positionally — no `Object.values` or `Object.entries` over a returned
 * `TransactionAmounts` or `CommitmentPaymentAmounts` — because adding a leg
 * reorders them again. Every consumer reads these fields by name today. That
 * binds the returns, not this function: the `Object.entries` below walks the
 * guard's own input record, and there the order is load-bearing — each key's
 * `assertStorable` runs before the next key's zero-destination check, so
 * whichever offending leg comes first in the literal, an overflow ahead of
 * `destinationKey` or `destinationKey` itself, is the reason reported.
 *
 * Two things sit outside it, both deliberately. `assertStorable(amount)` at
 * the top of each resolver is not redundant with the `amount` leg below: it
 * owns throw precedence over the rate check, and over the destination check
 * in `resolveTransactionAmounts` — the only one of the two resolvers that
 * has one. An amount that is unstorable and also missing its rate or its
 * destination reports `unstorable`, not the undiscriminated message. It is
 * also what makes the second check free rather than defensive: the guard
 * receives that same `const amount` — as `amount` here, `paymentAmount`
 * there — so once the top call has returned, that leg cannot fire on any
 * input, and the duplicate costs one more call into `assertStorable` — both
 * its predicates run, neither can fire. And a field added to a
 * return's passthrough tail — beside `exchangeRate` on the transaction
 * return, beside `accountCurrency, exchangeRate` on the commitment one — is
 * still unguarded: six independent call sites narrow to those two tails,
 * they do not close at compile time.
 *
 * `destinationKey` names the one leg (`toAmount`, `accountNativeAmount`) that must not be
 * exactly `0` — the ruling on #363. It checks the already-rounded value, not the boundary
 * inequality that produced it (`.claude/rules/money.md`: round once, at this layer). Scoped to
 * one named key rather than every leg, because `egpAmount` for a plain Expense/Income can
 * legitimately underflow to `0` too (spec §7.6, out of scope here) and must not throw.
 */
function assertStorableLegs<T extends Record<string, number | null>>(
  legs: T,
  destinationKey?: keyof T,
): T {
  for (const [key, value] of Object.entries(legs)) {
    if (value === null) continue;
    assertStorable(value);
    if (key === destinationKey && value === 0) {
      throw new TransactionAmountError(
        'The destination amount rounds to 0 at this exchange rate',
        'zero-destination',
      );
    }
  }
  return legs;
}

export function resolveTransactionAmounts(input: {
  type: TransactionType;
  amount: number;
  sourceCurrency: Currency;
  destinationCurrency?: Currency;
  exchangeRate?: number;
}): TransactionAmounts {
  const amount = roundMoney(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new TransactionAmountError('Transaction amount must be positive');
  }
  assertStorable(amount);

  const hasDestination = requiresDestination(input.type);
  if (hasDestination && input.destinationCurrency === undefined) {
    throw new TransactionAmountError('A destination currency is required');
  }

  const usesUsd = requiresExchangeRate(
    input.sourceCurrency,
    hasDestination ? input.destinationCurrency : undefined,
  );
  if (
    usesUsd &&
    (!input.exchangeRate || !Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0)
  ) {
    throw new TransactionAmountError('A positive USD exchange rate is required');
  }

  const exchangeRate = usesUsd ? (input.exchangeRate ?? null) : null;
  const egpAmount =
    input.sourceCurrency === Currency.USD
      ? roundMoney(amount * (exchangeRate ?? 0))
      : roundMoney(amount);

  const toAmount = !hasDestination
    ? null
    : input.destinationCurrency === Currency.EGP
      ? egpAmount
      : input.sourceCurrency === Currency.USD
        ? roundMoney(amount)
        : roundMoney(egpAmount / (exchangeRate ?? 0));

  return {
    ...assertStorableLegs({ amount, egpAmount, toAmount }, 'toAmount'),
    exchangeRate,
  };
}

export function resolveCommitmentPaymentAmounts(input: {
  amount: number;
  commitmentCurrency: Currency;
  accountCurrency: Currency;
  exchangeRate?: number;
}): CommitmentPaymentAmounts {
  const amount = roundMoney(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new TransactionAmountError('Payment amount must be positive');
  }
  assertStorable(amount);

  const usesUsd = requiresExchangeRate(input.commitmentCurrency, input.accountCurrency);
  if (
    usesUsd &&
    (!input.exchangeRate || !Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0)
  ) {
    throw new TransactionAmountError('A positive USD exchange rate is required');
  }

  const exchangeRate = usesUsd ? (input.exchangeRate ?? null) : null;
  const egpAmount =
    input.commitmentCurrency === Currency.USD
      ? roundMoney(amount * (exchangeRate ?? 0))
      : roundMoney(amount);
  const accountNativeAmount =
    input.accountCurrency === Currency.USD
      ? input.commitmentCurrency === Currency.USD
        ? roundMoney(amount)
        : roundMoney(egpAmount / (exchangeRate ?? 0))
      : egpAmount;

  return {
    ...assertStorableLegs(
      { paymentAmount: amount, accountNativeAmount, egpAmount },
      'accountNativeAmount',
    ),
    accountCurrency: input.accountCurrency,
    exchangeRate,
  };
}
