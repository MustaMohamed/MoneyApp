import { Currency, TransactionType } from '@/constants/enums';
import {
  resolveTransactionAmounts,
  TransactionAmountError,
} from '@/modules/transactions/domain/transaction_amounts';

describe('resolveTransactionAmounts', () => {
  it('normalizes a USD expense to EGP without a destination amount', () => {
    expect(
      resolveTransactionAmounts({
        type: TransactionType.Expense,
        amount: 10,
        sourceCurrency: Currency.USD,
        exchangeRate: 50,
      }),
    ).toEqual({ amount: 10, egpAmount: 500, toAmount: null, exchangeRate: 50 });
  });

  it.each([TransactionType.Transfer, TransactionType.CCPayment])(
    'converts an EGP source to a USD destination for %s',
    (type) => {
      expect(
        resolveTransactionAmounts({
          type,
          amount: 500,
          sourceCurrency: Currency.EGP,
          destinationCurrency: Currency.USD,
          exchangeRate: 50,
        }),
      ).toEqual({ amount: 500, egpAmount: 500, toAmount: 10, exchangeRate: 50 });
    },
  );

  it.each([TransactionType.Transfer, TransactionType.CCPayment])(
    'converts a USD source to an EGP destination for %s',
    (type) => {
      expect(
        resolveTransactionAmounts({
          type,
          amount: 10,
          sourceCurrency: Currency.USD,
          destinationCurrency: Currency.EGP,
          exchangeRate: 50,
        }),
      ).toEqual({ amount: 10, egpAmount: 500, toAmount: 500, exchangeRate: 50 });
    },
  );

  it.each([TransactionType.Transfer, TransactionType.CCPayment])(
    'keeps the source amount for a USD-to-USD destination for %s',
    (type) => {
      expect(
        resolveTransactionAmounts({
          type,
          amount: 10,
          sourceCurrency: Currency.USD,
          destinationCurrency: Currency.USD,
          exchangeRate: 50,
        }),
      ).toEqual({ amount: 10, egpAmount: 500, toAmount: 10, exchangeRate: 50 });
    },
  );

  it('does not persist an exchange rate when neither side uses USD', () => {
    expect(
      resolveTransactionAmounts({
        type: TransactionType.Transfer,
        amount: 500,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.EGP,
        exchangeRate: 50,
      }),
    ).toEqual({ amount: 500, egpAmount: 500, toAmount: 500, exchangeRate: null });
  });

  it('rejects a missing destination and invalid rate', () => {
    expect(() =>
      resolveTransactionAmounts({
        type: TransactionType.CCPayment,
        amount: 500,
        sourceCurrency: Currency.EGP,
      }),
    ).toThrow(TransactionAmountError);
    expect(() =>
      resolveTransactionAmounts({
        type: TransactionType.Transfer,
        amount: 500,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRate: 0,
      }),
    ).toThrow(TransactionAmountError);
  });

  describe('rounds the input amount once, upstream of derivation (ADR: money-rounding-layer)', () => {
    // The worked number is the gate: it fails if input.amount is used
    // unrounded anywhere downstream, which the idempotence property below
    // cannot detect (it holds identically when nothing is rounded at all).
    it('10.005 USD @ rate 48 persists amount 10, egpAmount 480 — spec row 15', () => {
      expect(
        resolveTransactionAmounts({
          type: TransactionType.Expense,
          amount: 10.005,
          sourceCurrency: Currency.USD,
          exchangeRate: 48,
        }),
      ).toEqual({ amount: 10, egpAmount: 480, toAmount: null, exchangeRate: 48 });
    });

    it('EGP -> USD destination: 500.005 EGP @ rate 48 rounds amount before deriving toAmount', () => {
      expect(
        resolveTransactionAmounts({
          type: TransactionType.Transfer,
          amount: 500.005,
          sourceCurrency: Currency.EGP,
          destinationCurrency: Currency.USD,
          exchangeRate: 48,
        }),
      ).toEqual({ amount: 500, egpAmount: 500, toAmount: 10.42, exchangeRate: 48 });
    });

    it('USD -> EGP destination: 10.005 USD @ rate 48 rounds amount before deriving egpAmount/toAmount', () => {
      expect(
        resolveTransactionAmounts({
          type: TransactionType.CCPayment,
          amount: 10.005,
          sourceCurrency: Currency.USD,
          destinationCurrency: Currency.EGP,
          exchangeRate: 48,
        }),
      ).toEqual({ amount: 10, egpAmount: 480, toAmount: 480, exchangeRate: 48 });
    });

    it('USD -> USD destination: 10.005 USD @ rate 48 rounds amount before it is reused as toAmount', () => {
      expect(
        resolveTransactionAmounts({
          type: TransactionType.Transfer,
          amount: 10.005,
          sourceCurrency: Currency.USD,
          destinationCurrency: Currency.USD,
          exchangeRate: 48,
        }),
      ).toEqual({ amount: 10, egpAmount: 480, toAmount: 10, exchangeRate: 48 });
    });

    it('resolve(resolve(x).amount) deep-equals resolve(x) — idempotent under its own output', () => {
      const input = {
        type: TransactionType.Expense,
        amount: 10.005,
        sourceCurrency: Currency.USD,
        exchangeRate: 48,
      };
      const first = resolveTransactionAmounts(input);
      const second = resolveTransactionAmounts({ ...input, amount: first.amount });
      expect(second).toEqual(first);
    });

    // Layla row 23 — regression pin. Rounding runs before the positivity
    // throw, so an amount that rounds to zero still throws.
    it('0.005 EGP rounds to 0 and throws, rather than persisting a zero amount', () => {
      expect(() =>
        resolveTransactionAmounts({
          type: TransactionType.Expense,
          amount: 0.005,
          sourceCurrency: Currency.EGP,
        }),
      ).toThrow(TransactionAmountError);
    });

    // Layla row 24 — the floor's own boundary does not throw.
    it('0.01 USD @ rate 48 does not throw and derives egpAmount 0.48', () => {
      expect(
        resolveTransactionAmounts({
          type: TransactionType.Expense,
          amount: 0.01,
          sourceCurrency: Currency.USD,
          exchangeRate: 48,
        }),
      ).toEqual({ amount: 0.01, egpAmount: 0.48, toAmount: null, exchangeRate: 48 });
    });
  });
});
