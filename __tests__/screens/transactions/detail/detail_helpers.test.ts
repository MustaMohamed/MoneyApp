import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { InfoTokens } from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  buildTransactionDetailPresentation,
  getAccountTypeIcon,
  getCommitmentPaymentRoute,
  resolveDetailViewState,
} from '@/modules/transactions/screens/transactions/detail/detail.helpers';
import type { TransactionDetailStatus } from '@/modules/transactions/screens/transactions/detail/detail.state';

const now = '2026-07-20T12:00:00.000Z';

function account(overrides: Partial<Account>): Account {
  return {
    id: 'source',
    name: 'USD wallet',
    type: AccountType.Bank,
    currency: Currency.USD,
    opening_balance: 0,
    current_balance: 0,
    color: null,
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    is_archived: 0,
    balance_review_required: 0,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx',
    type: TransactionType.Transfer,
    amount: 100,
    currency: Currency.USD,
    egp_amount: 4_850,
    exchange_rate: 48.5,
    to_amount: 4_850,
    minimum_payment_snapshot: null,
    revolving_balance_delta: null,
    account_id: 'source',
    to_account_id: 'destination',
    category_id: null,
    budget_id: null,
    note: null,
    transaction_date: '2026-07-20',
    transaction_time: '12:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('getAccountTypeIcon', () => {
  // Locks the account-type → glyph mapping for the Detail screen's Account
  // row. Mirrors the dashboard's account_card.tsx mapping; a divergence here
  // means the same account would render with two different icons in two
  // different surfaces — exactly the bug this fix exists to prevent.
  const cases: Array<[AccountType, string]> = [
    [AccountType.Bank, 'bank'],
    [AccountType.SmartWallet, 'cellphone-nfc'],
    [AccountType.PhysicalWallet, 'wallet'],
    [AccountType.PhysicalSavings, 'piggy-bank'],
    [AccountType.CreditCard, 'credit-card'],
  ];

  for (const [type, icon] of cases) {
    it(`returns "${icon}" for ${type}`, () => {
      expect(getAccountTypeIcon(type)).toBe(icon);
    });
  }

  it('falls back to "card-bulleted-outline" when type is undefined', () => {
    // The account is looked up via accountsById.get(tx.account_id); if a
    // historical transaction references an account that no longer exists,
    // the lookup yields undefined and we must not crash. Old hardcoded
    // glyph is the safe default.
    expect(getAccountTypeIcon(undefined)).toBe('card-bulleted-outline');
  });

  it('falls back to "card-bulleted-outline" for unknown values', () => {
    // Defensive — the DB has CHECK constraints but legacy rows from an
    // older enum could still appear.
    expect(getAccountTypeIcon('legacy_type_xyz')).toBe('card-bulleted-outline');
  });
});

describe('getCommitmentPaymentRoute', () => {
  it('uses the payment id expected by the commitment detail route', () => {
    expect(getCommitmentPaymentRoute('payment-1')).toBe('/commitments/payment-1');
  });
});

describe('resolveDetailViewState', () => {
  it.each<
    [
      string,
      TransactionDetailStatus,
      boolean,
      boolean,
      boolean,
      ReturnType<typeof resolveDetailViewState>,
    ]
  >([
    ['idle', 'idle', false, false, false, 'loading'],
    ['initial loading', 'initialLoading', false, false, false, 'loading'],
    ['not found', 'notFound', false, false, false, 'notFound'],
    ['first-load failure', 'firstLoadError', false, false, false, 'firstLoadError'],
    ['ready', 'ready', true, false, false, 'ready'],
    ['refreshing with data', 'ready', true, true, false, 'refreshing'],
    ['refresh failure with data', 'ready', true, false, true, 'refreshErrorWithData'],
  ])('%s', (_name, status, hasTransaction, revalidating, refreshError, expected) => {
    expect(resolveDetailViewState(status, hasTransaction, revalidating, refreshError)).toBe(
      expected,
    );
  });
});

describe('buildTransactionDetailPresentation', () => {
  it('exposes native send and receive values for a transfer', () => {
    const source = account({});
    const destination = account({
      id: 'destination',
      name: 'CIB',
      currency: Currency.EGP,
    });

    expect(
      buildTransactionDetailPresentation({
        tx: transaction({}),
        account: source,
        toAccount: destination,
      }).transferFlow,
    ).toMatchObject({
      fromAmountText: '100 USD',
      toAmountText: '4,850 EGP',
    });
  });

  it('includes named budget and commitment ownership', () => {
    const budget: Budget = {
      id: 'budget',
      category_id: 'category',
      name: 'Conference meals',
      limit_amount: 500,
      effective_from: '2026-07',
      created_at: now,
      updated_at: now,
    };

    expect(
      buildTransactionDetailPresentation({
        tx: transaction({
          type: TransactionType.Expense,
          currency: Currency.EGP,
          to_account_id: null,
          to_amount: null,
          budget_id: budget.id,
          commitment_payment_id: 'payment',
        }),
        account: account({ currency: Currency.EGP }),
        budget,
      }),
    ).toMatchObject({
      budgetLabel: 'Conference meals',
      sourceLabel: Strings.typeBadgeCommitment,
    });
  });

  it('presents credit-card income as Card credit', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({
          type: TransactionType.Income,
          currency: Currency.EGP,
          to_account_id: null,
          to_amount: null,
          amount: 250,
          egp_amount: 250,
        }),
        account: account({ type: AccountType.CreditCard, currency: Currency.EGP }),
      }),
    ).toMatchObject({
      title: Strings.cardCreditTitle,
      amountText: '+250 EGP',
      categoryBadge: Strings.cardCreditTitle,
      categoryBadgeTone: 'info',
      heroColor: InfoTokens[500],
    });
  });
});
