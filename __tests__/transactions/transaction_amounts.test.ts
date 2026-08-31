import { Currency, TransactionType } from '@/constants/enums';
import {
  requiresExchangeRate,
  resolveCommitmentPaymentAmounts,
  resolveTransactionAmounts,
  TransactionAmountError,
} from '@/modules/transactions/domain/transaction_amounts';

describe('requiresExchangeRate', () => {
  it.each([
    [Currency.EGP, Currency.EGP, false],
    [Currency.EGP, Currency.USD, true],
    [Currency.USD, Currency.EGP, true],
    [Currency.USD, Currency.USD, true],
  ] as const)('(%s, %s) is %s', (a, b, expected) => {
    expect(requiresExchangeRate(a, b)).toBe(expected);
  });

  // `undefined` never demands a rate on its own, and never suppresses one the other side needs.
  it.each([
    [Currency.EGP, undefined, false],
    [Currency.USD, undefined, true],
    [undefined, Currency.EGP, false],
    [undefined, Currency.USD, true],
    [undefined, undefined, false],
  ] as const)('(%s, %s) is %s with an absent currency', (a, b, expected) => {
    expect(requiresExchangeRate(a, b)).toBe(expected);
  });

  it('answers on one argument, for the sites that have no second currency', () => {
    expect(requiresExchangeRate(Currency.USD)).toBe(true);
    expect(requiresExchangeRate(Currency.EGP)).toBe(false);
  });
});

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
    // The worked number is the gate; the idempotence property below holds when nothing is rounded.
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

    it('0.005 EGP rounds to 0 and throws, rather than persisting a zero amount', () => {
      expect(() =>
        resolveTransactionAmounts({
          type: TransactionType.Expense,
          amount: 0.005,
          sourceCurrency: Currency.EGP,
        }),
      ).toThrow(TransactionAmountError);
    });

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

  // No computed, rounded leg may reach a caller non-finite or above MAX_SAFE_INTEGER.
  describe('output guard (§3.4)', () => {
    // 1e-16 is needed: 100 / 1e-10 = 1e12 would not trip the guard, MAX_SAFE_INTEGER is ~9.007e15.
    it('a tiny rate dividing the destination leg throws, rather than persisting 1e18', () => {
      expect(() =>
        resolveTransactionAmounts({
          type: TransactionType.Transfer,
          amount: 100,
          sourceCurrency: Currency.EGP,
          destinationCurrency: Currency.USD,
          exchangeRate: 1e-16,
        }),
      ).toThrow(expect.objectContaining({ reason: 'unstorable' }));
    });

    // 1e14 clears its own bound; the egpAmount multiply leg is what overflows.
    it('a huge amount multiplied by the rate throws on the egpAmount leg', () => {
      expect(() =>
        resolveTransactionAmounts({
          type: TransactionType.Expense,
          amount: 1e14,
          sourceCurrency: Currency.USD,
          exchangeRate: 1000,
        }),
      ).toThrow(expect.objectContaining({ reason: 'unstorable' }));
    });

    // The boundary itself must not throw; this input reds a `>` to `>=` mutation in the guard.
    it('an amount exactly at MAX_SAFE_INTEGER does not throw', () => {
      expect(() =>
        resolveTransactionAmounts({
          type: TransactionType.Expense,
          amount: Number.MAX_SAFE_INTEGER,
          sourceCurrency: Currency.EGP,
        }),
      ).not.toThrow();
    });
  });
});

describe('resolveCommitmentPaymentAmounts', () => {
  // 10.999 is reused across all four currency pairs so one input exercises every branch.
  it('EGP commitment / EGP account: 10.999 rounds to 11 before deriving anything', () => {
    expect(
      resolveCommitmentPaymentAmounts({
        amount: 10.999,
        commitmentCurrency: Currency.EGP,
        accountCurrency: Currency.EGP,
      }),
    ).toEqual({
      paymentAmount: 11,
      accountNativeAmount: 11,
      accountCurrency: Currency.EGP,
      egpAmount: 11,
      exchangeRate: null,
    });
  });

  it('USD commitment / EGP account: 10.999 USD @ rate 48 persists egpAmount 528.00, not 527.95', () => {
    expect(
      resolveCommitmentPaymentAmounts({
        amount: 10.999,
        commitmentCurrency: Currency.USD,
        accountCurrency: Currency.EGP,
        exchangeRate: 48,
      }),
    ).toEqual({
      paymentAmount: 11,
      accountNativeAmount: 528,
      accountCurrency: Currency.EGP,
      egpAmount: 528,
      exchangeRate: 48,
    });
  });

  it('EGP commitment / USD account: 10.999 EGP @ rate 48 rounds amount before deriving accountNativeAmount', () => {
    expect(
      resolveCommitmentPaymentAmounts({
        amount: 10.999,
        commitmentCurrency: Currency.EGP,
        accountCurrency: Currency.USD,
        exchangeRate: 48,
      }),
    ).toEqual({
      paymentAmount: 11,
      accountNativeAmount: 0.23,
      accountCurrency: Currency.USD,
      egpAmount: 11,
      exchangeRate: 48,
    });
  });

  it('USD commitment / USD account: 10.999 @ rate 48 rounds amount before it is reused as accountNativeAmount', () => {
    expect(
      resolveCommitmentPaymentAmounts({
        amount: 10.999,
        commitmentCurrency: Currency.USD,
        accountCurrency: Currency.USD,
        exchangeRate: 48,
      }),
    ).toEqual({
      paymentAmount: 11,
      accountNativeAmount: 11,
      accountCurrency: Currency.USD,
      egpAmount: 528,
      exchangeRate: 48,
    });
  });

  it('rejects a missing or non-positive USD exchange rate', () => {
    expect(() =>
      resolveCommitmentPaymentAmounts({
        amount: 10,
        commitmentCurrency: Currency.USD,
        accountCurrency: Currency.EGP,
      }),
    ).toThrow(TransactionAmountError);
    expect(() =>
      resolveCommitmentPaymentAmounts({
        amount: 10,
        commitmentCurrency: Currency.EGP,
        accountCurrency: Currency.USD,
        exchangeRate: 0,
      }),
    ).toThrow(TransactionAmountError);
  });

  it('0.005 rounds to 0 and throws, rather than persisting a zero payment', () => {
    expect(() =>
      resolveCommitmentPaymentAmounts({
        amount: 0.005,
        commitmentCurrency: Currency.EGP,
        accountCurrency: Currency.EGP,
      }),
    ).toThrow(TransactionAmountError);
  });

  // 1 / 40 is exactly 0.025 and half-even rounds down; 1.005 kills a divide-once-round-once path.
  it.each([[1], [1.005]])(
    'EGP commitment / USD account: %p EGP @ 40 converts to 0.02, not 0.03',
    (amount) => {
      expect(
        resolveCommitmentPaymentAmounts({
          amount,
          commitmentCurrency: Currency.EGP,
          accountCurrency: Currency.USD,
          exchangeRate: 40,
        }),
      ).toEqual({
        paymentAmount: 1,
        accountNativeAmount: 0.02,
        accountCurrency: Currency.USD,
        egpAmount: 1,
        exchangeRate: 40,
      });
    },
  );

  it('resolve(resolve(x).paymentAmount) deep-equals resolve(x) — idempotent under its own output', () => {
    const input = {
      amount: 10.999,
      commitmentCurrency: Currency.USD,
      accountCurrency: Currency.EGP,
      exchangeRate: 48,
    };
    const first = resolveCommitmentPaymentAmounts(input);
    const second = resolveCommitmentPaymentAmounts({ ...input, amount: first.paymentAmount });
    expect(second).toEqual(first);
  });

  describe('output guard (§3.4)', () => {
    it('a tiny rate dividing accountNativeAmount throws, rather than persisting 1e18', () => {
      expect(() =>
        resolveCommitmentPaymentAmounts({
          amount: 100,
          commitmentCurrency: Currency.EGP,
          accountCurrency: Currency.USD,
          exchangeRate: 1e-16,
        }),
      ).toThrow(expect.objectContaining({ reason: 'unstorable' }));
    });

    it('a huge amount multiplied by the rate throws on the egpAmount leg', () => {
      expect(() =>
        resolveCommitmentPaymentAmounts({
          amount: 1e14,
          commitmentCurrency: Currency.USD,
          accountCurrency: Currency.EGP,
          exchangeRate: 1000,
        }),
      ).toThrow(expect.objectContaining({ reason: 'unstorable' }));
    });

    it('an amount exactly at MAX_SAFE_INTEGER does not throw', () => {
      expect(() =>
        resolveCommitmentPaymentAmounts({
          amount: Number.MAX_SAFE_INTEGER,
          commitmentCurrency: Currency.EGP,
          accountCurrency: Currency.EGP,
        }),
      ).not.toThrow();
    });
  });
});
