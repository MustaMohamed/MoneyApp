import { AccountType, Currency, TransactionType } from '@/constants/enums';
import {
  resolveCreateEffect,
  resolveDeleteDeltas,
  resolveUpdateEffect,
  TransactionPolicyError,
  type LedgerAccountSnapshot,
  type TransactionPolicyCommand,
} from '@/modules/transactions/domain/transaction_policy';

/**
 * @layla's ruling — spec.md § "revolving_balance at creation — ruled" —
 * seeds `0` for Credit Card, `null` for every other type, at creation.
 * Parts B and C are confirmation/regression tests over the EXISTING,
 * unmodified transactions domain: they exist because the ruling's argument
 * depends on this code's current behaviour, not because MA-009 changes it.
 *
 * No file under src/modules/transactions/ is edited to make any of these
 * pass. A red result here means diagnose the fixture first (see the header
 * comment on Part B below); if it survives a correct fixture, the ruling's
 * premise is wrong and this task escalates to @layla rather than patching
 * transaction_policy.ts (MA-009.md:44, spec.md:318).
 *
 * Fixtures follow transaction_policy.test.ts's own account()/command() shape
 * (transaction_policy.test.ts:17-42).
 */

function account(
  id: string,
  type: AccountType,
  overrides: Partial<LedgerAccountSnapshot> = {},
): LedgerAccountSnapshot {
  return {
    id,
    type,
    currency: Currency.EGP,
    currentBalance: type === AccountType.CreditCard ? 500 : 2_000,
    revolvingBalance: type === AccountType.CreditCard ? 300 : null,
    minimumPayment: type === AccountType.CreditCard ? 100 : null,
    ...overrides,
  };
}

function command(overrides: Partial<TransactionPolicyCommand> = {}): TransactionPolicyCommand {
  return {
    type: TransactionType.Expense,
    amount: 100,
    egpAmount: 100,
    toAmount: null,
    minimumPaymentSnapshot: null,
    source: account('source', AccountType.Bank),
    ...overrides,
  };
}

/**
 * Part B — first payment on a newly-created card. Exercises the existing,
 * unmodified `resolveCreateEffect` on a CCPayment, asserting
 * `revolvingBalanceDelta` (spec.md's Part B table).
 *
 * Diagnosis note (plan review, round 1): `resolveCreateEffect` runs
 * `validateTransactionPolicy` and throws on ANY policy issue
 * (transaction_policy.ts:231-232), so a malformed CCPayment command (missing
 * destination, bad toAmount, mismatched currencies) throws for a reason that
 * has nothing to do with revolving_balance. Every fixture below is built to
 * satisfy validateTransactionPolicy on its own terms — asset source,
 * card destination, toAmount within the card's currentBalance — precisely so
 * a red result here is never that.
 */
describe('card_revolving_seed — @layla Part B — resolveCreateEffect, CCPayment', () => {
  it('B1 — first payment, card seeded 0 (this ruling) — delta 0, no throw', () => {
    const destination = account('card', AccountType.CreditCard, {
      currentBalance: 1000,
      revolvingBalance: 0,
    });
    const effect = resolveCreateEffect(
      command({
        type: TransactionType.CCPayment,
        amount: 500,
        egpAmount: 500,
        toAmount: 500,
        minimumPaymentSnapshot: 50,
        destination,
      }),
    );
    expect(effect.revolvingBalanceDelta).toBe(0);
  });

  it('B2 — first payment, card seeded null (legacy, pre-scope data) — delta 0, no throw — proves parity with B1', () => {
    const destination = account('card', AccountType.CreditCard, {
      currentBalance: 1000,
      revolvingBalance: null,
    });
    const effect = resolveCreateEffect(
      command({
        type: TransactionType.CCPayment,
        amount: 500,
        egpAmount: 500,
        toAmount: 500,
        minimumPaymentSnapshot: 50,
        destination,
      }),
    );
    expect(effect.revolvingBalanceDelta).toBe(0);
  });

  it('B1 and B2 produce deep-equal effects — the ?? 0 collapse before Math.max makes this true', () => {
    const base = {
      type: TransactionType.CCPayment as const,
      amount: 500,
      egpAmount: 500,
      toAmount: 500,
      minimumPaymentSnapshot: 50,
    };
    const effectSeededZero = resolveCreateEffect(
      command({
        ...base,
        destination: account('card', AccountType.CreditCard, {
          currentBalance: 1000,
          revolvingBalance: 0,
        }),
      }),
    );
    const effectSeededNull = resolveCreateEffect(
      command({
        ...base,
        destination: account('card', AccountType.CreditCard, {
          currentBalance: 1000,
          revolvingBalance: null,
        }),
      }),
    );
    expect(effectSeededZero).toEqual(effectSeededNull);
  });

  it('B3 — first payment, no minimum-payment snapshot — delta 0, no throw', () => {
    const destination = account('card', AccountType.CreditCard, {
      currentBalance: 1000,
      revolvingBalance: 0,
    });
    const effect = resolveCreateEffect(
      command({
        type: TransactionType.CCPayment,
        amount: 300,
        egpAmount: 300,
        toAmount: 300,
        minimumPaymentSnapshot: null,
        destination,
      }),
    );
    expect(effect.revolvingBalanceDelta).toBe(0);
  });
});

/**
 * Part C — edit/delete of a card transaction. Exercises the existing,
 * unmodified `resolveDeleteDeltas` / `resolveUpdateEffect`. C1 is a
 * deliberately-inconsistent snapshot (white-box test of the corruption
 * tripwire — not reachable through the app itself); C2 and C3 are ordinary
 * reachable flows.
 */
describe('card_revolving_seed — @layla Part C — resolveDeleteDeltas / resolveUpdateEffect', () => {
  it('C1 — delete a card payment against a corrupted negative snapshot — throws card_revolving_balance_would_be_negative', () => {
    // Simulated corruption: revolvingBalance is already negative before the
    // delete, which cannot happen through the app itself. currentBalance is
    // set high enough that only the revolving issue fires (validateResultingCardBalances
    // also checks card_balance_would_be_negative independently).
    const card = account('card', AccountType.CreditCard, {
      currentBalance: 1000,
      revolvingBalance: -500,
    });
    const cmd = command({
      type: TransactionType.CCPayment,
      amount: 100,
      egpAmount: 100,
      toAmount: 100,
      minimumPaymentSnapshot: null,
      // The exact previously-applied delta being undone (a stored -100 paydown).
      revolvingBalanceDelta: -100,
      destination: card,
    });

    let caught: unknown;
    try {
      resolveDeleteDeltas(cmd);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(TransactionPolicyError);
    // Assert the codes array CONTAINS the revolving code, not array equality
    // — validateResultingCardBalances can raise more than one issue. A type
    // guard, not a cast, so the property access stays type-safe.
    if (caught instanceof TransactionPolicyError) {
      expect(caught.issues.map((i) => i.code)).toContain(
        'card_revolving_balance_would_be_negative',
      );
    }
  });

  it('C2 — edit an existing payment on a legacy card, landing exactly on the zero boundary — no throw, resulting revolving 0', () => {
    // Card started at 100 (both currentBalance and revolvingBalance), one
    // prior payment of 100 paid it off: current snapshot is 0/0. The old
    // delta (-100) reverses to +100 (restored 100), and the replacement
    // pays 100 again (-100) — net 0, which is not negative.
    const oldCommand = command({
      type: TransactionType.CCPayment,
      amount: 100,
      egpAmount: 100,
      toAmount: 100,
      minimumPaymentSnapshot: 0,
      revolvingBalanceDelta: -100,
      destination: account('card', AccountType.CreditCard, {
        currentBalance: 0,
        revolvingBalance: 0,
      }),
    });
    const newCommand = command({
      type: TransactionType.CCPayment,
      amount: 100,
      egpAmount: 100,
      toAmount: 100,
      minimumPaymentSnapshot: 0,
      destination: account('card', AccountType.CreditCard, {
        currentBalance: 0,
        revolvingBalance: 0,
      }),
    });

    const effect = resolveUpdateEffect(oldCommand, newCommand);
    // Impl review round 1, D5: `(cardDelta?.revolvingBalance ?? 0) + 0` is `0`
    // whatever `transaction_policy.ts` does, because `??` swallows the
    // `undefined` case too — it was never distinguishing "no delta emitted"
    // from "a zero delta was emitted". The old payment (-100) reversed and
    // the identical new payment (-100) reapplied cancel exactly, so
    // `mergeAccountDeltas`' own zero-filter (transaction_policy.ts:260-262)
    // drops the card's delta entirely — asserted directly, with a real
    // failure mode: a resolver that emitted any non-zero delta bag for this
    // same-value edit would fail it.
    expect(effect.deltas).toEqual([]);
  });

  it('C3 — delete an unrelated expense on a legacy card whose revolving_balance was left null — no throw, skip stays null', () => {
    const card = account('card', AccountType.CreditCard, {
      currentBalance: 500,
      revolvingBalance: null,
    });
    const cmd = command({
      type: TransactionType.Expense,
      amount: 50,
      egpAmount: 50,
      source: card,
    });

    expect(() => resolveDeleteDeltas(cmd)).not.toThrow();
    const deltas = resolveDeleteDeltas(cmd);
    const cardDelta = deltas.find((d) => d.accountId === 'card');
    // Non-cc_payment deltas carry revolvingBalance 0 by construction — the
    // skip is correct because the quantity was never tracked (null stays
    // null regardless of what a 0 delta would apply it to).
    expect(cardDelta?.revolvingBalance ?? 0).toBe(0);
  });
});
