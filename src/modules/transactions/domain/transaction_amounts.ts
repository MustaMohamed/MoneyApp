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

/** Only the unstorable throw sets `reason`; `resolveTransactionSaveError` is its only reader. */
export class TransactionAmountError extends Error {
  constructor(
    message: string,
    readonly reason?: 'unstorable',
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
 * Two things sit outside it, both deliberately. `assertStorable(amount)` at
 * the top of each resolver is not redundant with the `amount` leg below: it
 * owns throw precedence over the destination and rate checks, so an input
 * that trips both reports `unstorable`. And a field added to a return's
 * passthrough tail — beside `exchangeRate` — is still unguarded: six
 * independent call sites narrow to those two tails, they do not close at
 * compile time.
 */
function assertStorableLegs<T extends Record<string, number | null>>(legs: T): T {
  for (const value of Object.values(legs)) {
    if (value !== null) assertStorable(value);
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

  const hasDestination =
    input.type === TransactionType.Transfer || input.type === TransactionType.CCPayment;
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

  return { ...assertStorableLegs({ amount, egpAmount, toAmount }), exchangeRate };
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
    ...assertStorableLegs({ paymentAmount: amount, accountNativeAmount, egpAmount }),
    accountCurrency: input.accountCurrency,
    exchangeRate,
  };
}
