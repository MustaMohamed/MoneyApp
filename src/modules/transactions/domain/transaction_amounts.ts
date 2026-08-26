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

/**
 * Does a movement between these two currencies need a USD exchange rate?
 * True when either side is USD — the storage-currency rule, since `egp_amount`
 * is the ledger's own currency and a USD leg has to be converted to reach it.
 *
 * Wide on purpose: `undefined` compares unequal to `Currency.USD`, so a caller
 * holding an optional currency passes it straight in. **Callers own presence
 * semantics.** This answers the currency question only — it cannot express
 * "no account has been picked yet", and returns `true` for `(USD, undefined)`.
 * `usePaySheet`'s `requiresRate` keeps its own `!commitment || !selectedAccount`
 * guard in front of this call for exactly that reason.
 */
export function requiresExchangeRate(a: Currency | undefined, b?: Currency): boolean {
  return a === Currency.USD || b === Currency.USD;
}

/**
 * `reason` names the ONE throw cause a caller may need to react to
 * differently: `assertStorable`'s output-guard failure. Every other throw in
 * this file — missing destination, non-positive amount, missing rate — is a
 * bare domain literal with no discriminant, exactly like it was before this
 * class carried one: nothing downstream reacts to those individually, so
 * nothing here should suggest they are named surfaces. Only
 * `resolveTransactionSaveError` reads `reason`, and only to pick the one
 * mapped string; it is not a public error-code enum.
 */
export class TransactionAmountError extends Error {
  constructor(
    message: string,
    readonly reason?: 'unstorable',
  ) {
    super(message);
    this.name = 'TransactionAmountError';
  }
}

/**
 * Every computed, rounded leg passes through here before a resolver can
 * return it. The invariant (ADR: parse-floor-money-only): no computed money
 * value above `MAX_SAFE_INTEGER` or non-finite ever reaches a `db.runAsync`
 * bind. `parseRateText` (parse_decimal.ts) carries no magnitude bound at
 * parse — this is the net that makes that safe. `>`, not `>=`: the boundary
 * value itself is still representable (upper-bound precedent:
 * budget_month_profiles.ts's income guard). Throws a bare domain literal,
 * like every other throw in this file — `resolveTransactionSaveError` maps
 * user copy from `reason`, never from this message.
 */
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
