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

    // One leg over the bound with every other leg under it: the amount is
    // 1e16 while the egpAmount multiply leg lands at 1e15 and clears its own
    // bound. Reds only if the amount leg goes unguarded everywhere — the
    // check above and the record guard each cover it today.
    it('the amount leg alone overflowing throws, with every derived leg in range', () => {
      expect(() =>
        resolveTransactionAmounts({
          type: TransactionType.Expense,
          amount: 1e16,
          sourceCurrency: Currency.USD,
          exchangeRate: 0.1,
        }),
      ).toThrow(expect.objectContaining({ reason: 'unstorable' }));
    });

    // Throw precedence. The storable check on the amount runs ahead of the
    // destination and rate checks, so an input that trips both reports
    // 'unstorable' — the one discriminated reason this module carries —
    // rather than the undiscriminated message. Demoting that check to the
    // return guard reds these two tests and nothing else in the suite.
    it('an unstorable amount is reported as unstorable even when the destination currency is missing', () => {
      expect(() =>
        resolveTransactionAmounts({
          type: TransactionType.Transfer,
          amount: 1e16,
          sourceCurrency: Currency.EGP,
        }),
      ).toThrow(expect.objectContaining({ reason: 'unstorable' }));
    });

    it('an unstorable amount is reported as unstorable even when the rate is missing', () => {
      expect(() =>
        resolveTransactionAmounts({
          type: TransactionType.Expense,
          amount: 1e16,
          sourceCurrency: Currency.USD,
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

    // exchangeRate is passed through, not computed, so it sits outside the
    // guard by ADR (parse-floor-money-only) §2 — a rate above
    // MAX_SAFE_INTEGER still saves. Reds if the guard is widened to every
    // field on the returned object.
    //
    // The `toAmount: 0` in the expectation is an unguarded residual, not a
    // decided behaviour, and it is not an artefact of the absurd rate: at an
    // ordinary rate 50, `{Transfer, 0.2, EGP -> USD}` returns `amount: 0.2`
    // with `toAmount: 0` too. Nothing on the way to storage rejects it — no
    // positive-value guard exists on the computed legs here;
    // `validateNormalizedInput` (transaction.repository.ts:159) checks only
    // currency match and `normalizedAmountsMatch`, which re-derives through
    // this same resolver, so a zero leg reconciles by construction; and
    // `to_amount` carries no CHECK constraint (migration 005 adds it as a
    // bare REAL). Pre-existing and out of scope here (spec §7.6): this pin
    // records the value, it does not endorse it.
    it('an exchange rate above MAX_SAFE_INTEGER is passed through, not bounded', () => {
      expect(
        resolveTransactionAmounts({
          type: TransactionType.Transfer,
          amount: 500,
          sourceCurrency: Currency.EGP,
          destinationCurrency: Currency.USD,
          exchangeRate: 1e20,
        }),
      ).toEqual({ amount: 500, egpAmount: 500, toAmount: 0, exchangeRate: 1e20 });
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

    // The paymentAmount leg alone: 1e16 exceeds MAX_SAFE_INTEGER while
    // egpAmount and accountNativeAmount both land at 1e15.
    it('the paymentAmount leg alone overflowing throws, with every derived leg in range', () => {
      expect(() =>
        resolveCommitmentPaymentAmounts({
          amount: 1e16,
          commitmentCurrency: Currency.USD,
          accountCurrency: Currency.EGP,
          exchangeRate: 0.1,
        }),
      ).toThrow(expect.objectContaining({ reason: 'unstorable' }));
    });

    // A USD account splits the two derived legs: accountNativeAmount reuses
    // the 1e14 payment amount while egpAmount multiplies to 1e17. The EGP
    // account above cannot isolate egpAmount, because it binds
    // accountNativeAmount to the same value.
    it('the egpAmount leg overflowing throws when accountNativeAmount is in range', () => {
      expect(() =>
        resolveCommitmentPaymentAmounts({
          amount: 1e14,
          commitmentCurrency: Currency.USD,
          accountCurrency: Currency.USD,
          exchangeRate: 1000,
        }),
      ).toThrow(expect.objectContaining({ reason: 'unstorable' }));
    });

    // Throw precedence, mirroring the pair above on resolveTransactionAmounts.
    // This resolver has no destination check, so the rate check is the only
    // throw the storable check has to outrun: a USD commitment paid from a USD
    // account needs a rate, and this input has none. Demoting the hand
    // `assertStorable(amount)` at the top of this resolver into the return
    // guard flips this input from 'Computed amount exceeds the storable range'
    // with `reason: 'unstorable'` to 'A positive USD exchange rate is required'
    // with `reason: undefined`: the error stops carrying the discriminant that
    // `resolveTransactionSaveError` maps. That is a contract change, not a
    // user-visible one — no commitment call site reads `reason` today (spec §0
    // C2). It reds nothing else in the suite.
    it('an unstorable payment amount is reported as unstorable even when the rate is missing', () => {
      expect(() =>
        resolveCommitmentPaymentAmounts({
          amount: 1e16,
          commitmentCurrency: Currency.USD,
          accountCurrency: Currency.USD,
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

    // Mirrors the passthrough pin on resolveTransactionAmounts above,
    // `accountNativeAmount: 0` included: the same unguarded residual, equally
    // independent of the absurd rate — a 0.20 EGP commitment paid from a USD
    // account at rate 50 also returns `accountNativeAmount: 0`. What differs
    // is downstream, and it is the schema's doing rather than this file's:
    // `markAsPaid` binds this leg into the transaction row's `amount`
    // (commitment.repository.ts:224), and that column is
    // `CHECK(amount > 0)` (migration 004), so the zero fails at insert
    // instead of persisting. The resolver still returns it. Recorded, not
    // endorsed — same scope note as the pin above.
    it('an exchange rate above MAX_SAFE_INTEGER is passed through on a commitment payment', () => {
      expect(
        resolveCommitmentPaymentAmounts({
          amount: 100,
          commitmentCurrency: Currency.EGP,
          accountCurrency: Currency.USD,
          exchangeRate: 1e300,
        }),
      ).toEqual({
        paymentAmount: 100,
        accountNativeAmount: 0,
        accountCurrency: Currency.USD,
        egpAmount: 100,
        exchangeRate: 1e300,
      });
    });
  });
});
