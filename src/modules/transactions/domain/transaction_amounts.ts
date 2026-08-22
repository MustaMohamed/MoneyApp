import { Currency, TransactionType } from '@/constants/enums';
import { roundMoney } from '@/utils/money';

export interface TransactionAmounts {
  amount: number;
  egpAmount: number;
  toAmount: number | null;
  exchangeRate: number | null;
}

export interface CommitmentPaymentAmounts {
  accountNativeAmount: number;
  accountCurrency: Currency;
  egpAmount: number;
  exchangeRate: number | null;
}

export class TransactionAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionAmountError';
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

  const hasDestination =
    input.type === TransactionType.Transfer || input.type === TransactionType.CCPayment;
  if (hasDestination && input.destinationCurrency === undefined) {
    throw new TransactionAmountError('A destination currency is required');
  }

  const usesUsd =
    input.sourceCurrency === Currency.USD ||
    (hasDestination && input.destinationCurrency === Currency.USD);
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

  if (!hasDestination) {
    return { amount, egpAmount, toAmount: null, exchangeRate };
  }

  const toAmount =
    input.destinationCurrency === Currency.EGP
      ? egpAmount
      : input.sourceCurrency === Currency.USD
        ? roundMoney(amount)
        : roundMoney(egpAmount / (exchangeRate ?? 0));

  return { amount, egpAmount, toAmount, exchangeRate };
}

export function resolveCommitmentPaymentAmounts(input: {
  amount: number;
  commitmentCurrency: Currency;
  accountCurrency: Currency;
  exchangeRate?: number;
}): CommitmentPaymentAmounts {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new TransactionAmountError('Payment amount must be positive');
  }

  const usesUsd =
    input.commitmentCurrency === Currency.USD || input.accountCurrency === Currency.USD;
  if (
    usesUsd &&
    (!input.exchangeRate || !Number.isFinite(input.exchangeRate) || input.exchangeRate <= 0)
  ) {
    throw new TransactionAmountError('A positive USD exchange rate is required');
  }

  const exchangeRate = usesUsd ? (input.exchangeRate ?? null) : null;
  const egpAmount =
    input.commitmentCurrency === Currency.USD
      ? roundMoney(input.amount * (exchangeRate ?? 0))
      : roundMoney(input.amount);
  const accountNativeAmount =
    input.accountCurrency === Currency.USD
      ? input.commitmentCurrency === Currency.USD
        ? roundMoney(input.amount)
        : roundMoney(egpAmount / (exchangeRate ?? 0))
      : egpAmount;

  return {
    accountNativeAmount,
    accountCurrency: input.accountCurrency,
    egpAmount,
    exchangeRate,
  };
}
