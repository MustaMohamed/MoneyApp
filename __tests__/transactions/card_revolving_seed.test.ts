import { AccountType, Currency, TransactionType } from '@/constants/enums';
import {
  resolveCreateEffect,
  resolveDeleteDeltas,
  resolveUpdateEffect,
  TransactionPolicyError,
  type LedgerAccountSnapshot,
  type TransactionPolicyCommand,
} from '@/modules/transactions/domain/transaction_policy';

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

// Every fixture below satisfies `validateTransactionPolicy`, which throws on any policy issue.
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

describe('card_revolving_seed — @layla Part C — resolveDeleteDeltas / resolveUpdateEffect', () => {
  it('C1 — delete a card payment against a corrupted negative snapshot — throws card_revolving_balance_would_be_negative', () => {
    // Corrupted snapshot the app cannot produce; the high balance isolates the revolving issue.
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
    // Contains, not equals: `validateResultingCardBalances` can raise more than one issue.
    if (caught instanceof TransactionPolicyError) {
      expect(caught.issues.map((i) => i.code)).toContain(
        'card_revolving_balance_would_be_negative',
      );
    }
  });

  it('C2 — edit an existing payment on a legacy card, landing exactly on the zero boundary — no throw, resulting revolving 0', () => {
    // The old delta (-100) reverses to +100 and the replacement pays 100 again: net 0.
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
    // `mergeAccountDeltas` filters zero deltas, so a cancelling edit emits no delta at all.
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
    // Non-cc_payment deltas carry revolvingBalance 0, so a null revolving balance stays null.
    expect(cardDelta?.revolvingBalance ?? 0).toBe(0);
  });
});
