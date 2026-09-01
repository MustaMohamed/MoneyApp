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
  assertStorable(egpAmount);

  if (!hasDestination) {
    return { amount, egpAmount, toAmount: null, exchangeRate };
  }

  const toAmount =
    input.destinationCurrency === Currency.EGP
      ? egpAmount
      : input.sourceCurrency === Currency.USD
        ? roundMoney(amount)
        : roundMoney(egpAmount / (exchangeRate ?? 0));
  assertStorable(toAmount);

  return { amount, egpAmount, toAmount, exchangeRate };
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
  assertStorable(egpAmount);
  const accountNativeAmount =
    input.accountCurrency === Currency.USD
      ? input.commitmentCurrency === Currency.USD
        ? roundMoney(amount)
        : roundMoney(egpAmount / (exchangeRate ?? 0))
      : egpAmount;
  assertStorable(accountNativeAmount);

  return {
    paymentAmount: amount,
    accountNativeAmount,
    accountCurrency: input.accountCurrency,
    egpAmount,
    exchangeRate,
  };
}
