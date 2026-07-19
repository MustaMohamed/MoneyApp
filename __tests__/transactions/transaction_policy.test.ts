import { AccountType, Currency, TransactionType } from '@/constants/enums';
import {
  invertAccountDeltas,
  mergeAccountDeltas,
  resolveCreateDeltas,
  resolveDeleteDeltas,
  resolvePrimaryBalanceDelta,
  resolveReportingClass,
  resolveReportingEffect,
  resolveUpdateDeltas,
  TransactionPolicyError,
  validateTransactionPolicy,
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

describe('transaction policy', () => {
  describe('reporting classification', () => {
    it.each(Object.values(AccountType))('classifies expenses from %s', (sourceType) => {
      expect(resolveReportingClass(TransactionType.Expense, sourceType)).toBe('expense');
    });

    it.each(Object.values(AccountType))('classifies income from %s', (sourceType) => {
      expect(resolveReportingClass(TransactionType.Income, sourceType)).toBe(
        sourceType === AccountType.CreditCard ? 'card_credit' : 'income',
      );
    });

    it.each(Object.values(AccountType))('classifies transfers from %s', (sourceType) => {
      expect(resolveReportingClass(TransactionType.Transfer, sourceType)).toBe('transfer');
    });

    it.each(Object.values(AccountType))('classifies card payments from %s', (sourceType) => {
      expect(resolveReportingClass(TransactionType.CCPayment, sourceType)).toBe('cc_payment');
    });
  });

  describe('primary account effects', () => {
    it.each([
      [TransactionType.Expense, AccountType.Bank, -100],
      [TransactionType.Expense, AccountType.CreditCard, 100],
      [TransactionType.Income, AccountType.Bank, 100],
      [TransactionType.Income, AccountType.CreditCard, -100],
      [TransactionType.Transfer, AccountType.Bank, -100],
      [TransactionType.CCPayment, AccountType.Bank, -100],
    ] as const)('resolves %s on %s', (type, sourceAccountType, expected) => {
      expect(resolvePrimaryBalanceDelta({ type, sourceAccountType, amount: 100 })).toBe(expected);
    });

    it('applies transfer amounts in each account native currency', () => {
      const policyCommand = command({
        type: TransactionType.Transfer,
        amount: 100,
        egpAmount: 5_000,
        toAmount: 102.35,
        source: account('egp-wallet', AccountType.Bank, { currency: Currency.EGP }),
        destination: account('usd-wallet', AccountType.SmartWallet, {
          currency: Currency.USD,
          currentBalance: 200,
        }),
      });

      expect(resolveCreateDeltas(policyCommand)).toEqual([
        { accountId: 'egp-wallet', currentBalance: -100, revolvingBalance: 0 },
        { accountId: 'usd-wallet', currentBalance: 102.35, revolvingBalance: 0 },
      ]);
    });

    it('preserves installment behavior when a card payment exceeds the captured minimum', () => {
      const policyCommand = command({
        type: TransactionType.CCPayment,
        amount: 150,
        egpAmount: 150,
        toAmount: 150,
        minimumPaymentSnapshot: 100,
        source: account('bank', AccountType.Bank),
        destination: account('card', AccountType.CreditCard),
      });

      expect(resolveCreateDeltas(policyCommand)).toEqual([
        { accountId: 'bank', currentBalance: -150, revolvingBalance: 0 },
        { accountId: 'card', currentBalance: -150, revolvingBalance: -50 },
      ]);
    });

    it('does not reduce revolving balance below zero', () => {
      const policyCommand = command({
        type: TransactionType.CCPayment,
        amount: 200,
        egpAmount: 200,
        toAmount: 200,
        minimumPaymentSnapshot: 100,
        source: account('bank', AccountType.Bank),
        destination: account('card', AccountType.CreditCard, { revolvingBalance: 30 }),
      });

      expect(resolveCreateDeltas(policyCommand)[1]).toEqual({
        accountId: 'card',
        currentBalance: -200,
        revolvingBalance: -30,
      });
    });

    it('does not change revolving balance for ordinary card expenses or credits', () => {
      const card = account('card', AccountType.CreditCard);

      expect(resolveCreateDeltas(command({ source: card }))).toEqual([
        { accountId: 'card', currentBalance: 100, revolvingBalance: 0 },
      ]);
      expect(resolveCreateDeltas(command({ type: TransactionType.Income, source: card }))).toEqual([
        { accountId: 'card', currentBalance: -100, revolvingBalance: 0 },
      ]);
    });
  });

  describe('reversals and updates', () => {
    it('inverts every account effect', () => {
      expect(
        invertAccountDeltas([
          { accountId: 'a', currentBalance: -100, revolvingBalance: 0 },
          { accountId: 'b', currentBalance: -50, revolvingBalance: -20 },
        ]),
      ).toEqual([
        { accountId: 'a', currentBalance: 100, revolvingBalance: 0 },
        { accountId: 'b', currentBalance: 50, revolvingBalance: 20 },
      ]);
    });

    it('merges account effects by account and removes zero effects', () => {
      expect(
        mergeAccountDeltas(
          [{ accountId: 'a', currentBalance: 100, revolvingBalance: 20 }],
          [
            { accountId: 'a', currentBalance: -100, revolvingBalance: -20 },
            { accountId: 'b', currentBalance: 10, revolvingBalance: 0 },
          ],
        ),
      ).toEqual([{ accountId: 'b', currentBalance: 10, revolvingBalance: 0 }]);
    });

    it('resolves update effects as old reversal plus new create effects', () => {
      const oldCommand = command({ amount: 100, egpAmount: 100 });
      const newCommand = command({
        amount: 250,
        egpAmount: 250,
        source: account('new-source', AccountType.PhysicalWallet),
      });

      expect(resolveUpdateDeltas(oldCommand, newCommand)).toEqual(
        mergeAccountDeltas(
          invertAccountDeltas(resolveCreateDeltas(oldCommand)),
          resolveCreateDeltas(newCommand),
        ),
      );
    });

    it('reverses an existing card credit without reapplying its create-time cap', () => {
      const existingCredit = command({
        type: TransactionType.Income,
        amount: 100,
        egpAmount: 100,
        source: account('card', AccountType.CreditCard, { currentBalance: 25 }),
      });

      expect(resolveDeleteDeltas(existingCredit)).toEqual([
        { accountId: 'card', currentBalance: 100, revolvingBalance: 0 },
      ]);
    });

    it('validates a replacement card credit against the restored liability', () => {
      const currentCard = account('card', AccountType.CreditCard, { currentBalance: 400 });
      const oldCommand = command({
        type: TransactionType.Income,
        amount: 100,
        egpAmount: 100,
        source: currentCard,
      });
      const newCommand = command({
        type: TransactionType.Income,
        amount: 500,
        egpAmount: 500,
        source: currentCard,
      });

      expect(resolveUpdateDeltas(oldCommand, newCommand)).toEqual([
        { accountId: 'card', currentBalance: -400, revolvingBalance: 0 },
      ]);
    });
  });

  describe('reporting effects', () => {
    it.each([
      [TransactionType.Expense, AccountType.Bank, 0, 100, 100],
      [TransactionType.Expense, AccountType.CreditCard, 0, 100, 100],
      [TransactionType.Income, AccountType.Bank, 100, 0, 0],
      [TransactionType.Income, AccountType.CreditCard, 0, -100, -100],
      [TransactionType.Transfer, AccountType.Bank, 0, 0, 0],
      [TransactionType.CCPayment, AccountType.Bank, 0, 0, 0],
    ] as const)(
      'reports %s from %s without double counting',
      (type, sourceType, incomeEgp, spendingEgp, budgetSpendingEgp) => {
        expect(
          resolveReportingEffect(
            command({
              type,
              source: account('source', sourceType),
              destination:
                type === TransactionType.Transfer
                  ? account('destination', AccountType.Bank)
                  : type === TransactionType.CCPayment
                    ? account('destination', AccountType.CreditCard)
                    : undefined,
              toAmount:
                type === TransactionType.Transfer || type === TransactionType.CCPayment
                  ? 100
                  : null,
            }),
          ),
        ).toEqual({ incomeEgp, spendingEgp, budgetSpendingEgp });
      },
    );
  });

  describe('validation', () => {
    it.each([
      [
        'missing transfer destination',
        command({ type: TransactionType.Transfer, toAmount: 100 }),
        'destination_required',
      ],
      [
        'credit card transfer source',
        command({
          type: TransactionType.Transfer,
          toAmount: 100,
          source: account('card', AccountType.CreditCard),
          destination: account('bank', AccountType.Bank),
        }),
        'transfer_requires_asset_accounts',
      ],
      [
        'credit card transfer destination',
        command({
          type: TransactionType.Transfer,
          toAmount: 100,
          destination: account('card', AccountType.CreditCard),
        }),
        'transfer_requires_asset_accounts',
      ],
      [
        'same transfer account',
        command({
          type: TransactionType.Transfer,
          toAmount: 100,
          destination: account('source', AccountType.Bank),
        }),
        'accounts_must_differ',
      ],
      [
        'credit card payment source',
        command({
          type: TransactionType.CCPayment,
          toAmount: 100,
          source: account('source-card', AccountType.CreditCard),
          destination: account('destination-card', AccountType.CreditCard),
        }),
        'cc_payment_requires_asset_source',
      ],
      [
        'asset payment destination',
        command({
          type: TransactionType.CCPayment,
          toAmount: 100,
          destination: account('destination', AccountType.Bank),
        }),
        'cc_payment_requires_card_destination',
      ],
      [
        'card credit above liability',
        command({
          type: TransactionType.Income,
          amount: 501,
          egpAmount: 501,
          source: account('card', AccountType.CreditCard),
        }),
        'card_credit_exceeds_liability',
      ],
      [
        'card payment above liability',
        command({
          type: TransactionType.CCPayment,
          amount: 501,
          egpAmount: 501,
          toAmount: 501,
          source: account('bank', AccountType.Bank),
          destination: account('card', AccountType.CreditCard),
        }),
        'cc_payment_exceeds_liability',
      ],
    ] as const)('rejects %s', (_label, policyCommand, expectedCode) => {
      expect(validateTransactionPolicy(policyCommand)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: expectedCode })]),
      );
      expect(() => resolveCreateDeltas(policyCommand)).toThrow(TransactionPolicyError);
    });

    it.each([
      ['zero amount', { amount: 0 }],
      ['non-finite amount', { amount: Number.POSITIVE_INFINITY }],
      ['zero EGP amount', { egpAmount: 0 }],
      ['non-finite EGP amount', { egpAmount: Number.NaN }],
    ] as const)('rejects %s', (_label, overrides) => {
      expect(validateTransactionPolicy(command(overrides))).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'amount_invalid' })]),
      );
    });
  });
});
