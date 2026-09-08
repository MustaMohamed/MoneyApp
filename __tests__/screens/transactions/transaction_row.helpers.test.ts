import {
  AccountType,
  BudgetGroup,
  CategoryType,
  Currency,
  TransactionType,
} from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  buildTransactionRowPresentation,
  TRANSACTION_ROW_CONTEXT_GAP,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_NOTE_TRACK_HEIGHT,
  TRANSACTION_ROW_SECONDARY_AMOUNT_TRACK_HEIGHT,
  TRANSACTION_ROW_TITLE_BADGE_HEIGHT,
  TRANSACTION_ROW_VERTICAL_PADDING,
} from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';

const now = '2026-07-20T12:00:00.000Z';

function account(overrides: Partial<Account>): Account {
  return {
    id: 'account-1',
    name: 'Daily wallet',
    type: AccountType.Bank,
    currency: Currency.EGP,
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
    is_deleted: 0,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    revolving_balance_delta: null,
    account_id: 'account-1',
    to_account_id: null,
    category_id: 'category-1',
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

const category: Category = {
  id: 'category-1',
  name: 'Food & Dining',
  type: CategoryType.Expense,
  icon: 'silverware-fork-knife',
  color: '#ffffff',
  budget_group: BudgetGroup.Need,
  is_default: 0,
  sort_order: 0,
  created_at: now,
  updated_at: now,
};

describe('buildTransactionRowPresentation', () => {
  it('shows both native transfer amounts with direction-aware account copy', () => {
    const source = account({ id: 'usd', name: 'USD wallet', currency: Currency.USD });
    const destination = account({ id: 'egp', name: 'CIB', currency: Currency.EGP });

    expect(
      buildTransactionRowPresentation({
        tx: transaction({
          type: TransactionType.Transfer,
          amount: 100,
          currency: Currency.USD,
          egp_amount: 4_850,
          exchange_rate: 48.5,
          to_amount: 4_850,
          account_id: source.id,
          to_account_id: destination.id,
          category_id: null,
        }),
        account: source,
        toAccount: destination,
      }),
    ).toMatchObject({
      title: Strings.transferTitle,
      context: 'USD wallet → CIB',
      primaryAmount: '100.00 USD',
      secondaryAmount: '→ 4,850 EGP',
    });
  });

  it('presents income into a credit card as a Card credit', () => {
    const card = account({
      id: 'card',
      name: 'Visa',
      type: AccountType.CreditCard,
      currency: Currency.EGP,
    });

    expect(
      buildTransactionRowPresentation({
        tx: transaction({ type: TransactionType.Income, account_id: card.id }),
        account: card,
        category,
      }),
    ).toMatchObject({
      title: Strings.cardCreditTitle,
      context: 'Food & Dining · Visa',
      primaryAmount: '+100 EGP',
      amountClassName: 'text-info',
    });
  });

  it('keeps source ownership compact and explicit', () => {
    expect(
      buildTransactionRowPresentation({
        tx: transaction({ commitment_payment_id: 'payment-1' }),
        account: account({}),
        category,
      }).ownershipLabel,
    ).toBe(Strings.typeBadgeCommitment);

    expect(
      buildTransactionRowPresentation({
        tx: transaction({ budget_id: 'budget-1' }),
        account: account({}),
        category,
      }).ownershipLabel,
    ).toBe(Strings.transactionBudgetAssigned);
  });

  it('normalizes notes and formats large values without changing the row contract', () => {
    expect(
      buildTransactionRowPresentation({
        tx: transaction({ amount: 1_250_000, egp_amount: 1_250_000, note: '  Annual rent  ' }),
        account: account({}),
        category,
      }),
    ).toMatchObject({
      primaryAmount: '−1,250,000 EGP',
      note: 'Annual rent',
    });
  });

  it('shows the EGP equivalent and captured rate for a USD expense', () => {
    expect(
      buildTransactionRowPresentation({
        tx: transaction({
          amount: 20,
          currency: Currency.USD,
          egp_amount: 1_000,
          exchange_rate: 50,
        }),
        account: account({ currency: Currency.USD }),
        category,
      }),
    ).toMatchObject({
      primaryAmount: '−20.00 USD',
      secondaryAmount: '≈ 1,000 EGP',
      rateText: '@ 50.00',
    });
  });

  it('leaves a sub-unit USD expense unescalated — its 2dp precision already carries the magnitude', () => {
    expect(
      buildTransactionRowPresentation({
        tx: transaction({ amount: 0.4, currency: Currency.USD, egp_amount: 20 }),
        account: account({ currency: Currency.USD }),
        category,
      }),
    ).toMatchObject({
      primaryAmount: '−0.40 USD',
    });
  });

  it('takes the context line from the surface when one is passed, and nothing else', () => {
    const input = { tx: transaction({}), account: account({}), category };
    const shipped = buildTransactionRowPresentation(input);
    const overridden = buildTransactionRowPresentation(input, '6 Sep');

    expect(overridden.context).toBe('6 Sep');
    expect(shipped.context).toBe('Daily wallet');
    expect(overridden.accessibilityLabel.split(', ')[1]).toBe('6 Sep');
    expect({
      ...overridden,
      context: shipped.context,
      accessibilityLabel: shipped.accessibilityLabel,
    }).toEqual(shipped);
  });

  it('gives commitment ownership precedence over a named budget', () => {
    expect(
      buildTransactionRowPresentation({
        tx: transaction({ commitment_payment_id: 'payment-1', budget_id: 'budget-1' }),
        account: account({}),
        category,
      }),
    ).toMatchObject({
      ownershipLabel: Strings.typeBadgeCommitment,
      isCommitmentOwned: true,
    });
  });
});

describe('buildTransactionRowPresentation — deleted accounts (MA-020)', () => {
  const deletedSource = account({ id: 'gone', name: '', is_archived: 1, is_deleted: 1 });
  const deletedTarget = account({ id: 'gone-too', name: '', is_archived: 1, is_deleted: 1 });

  it('reads "Deleted Account" as the context of an expense', () => {
    expect(
      buildTransactionRowPresentation({
        tx: transaction({ account_id: deletedSource.id }),
        account: deletedSource,
      }).context,
    ).toBe(Strings.deletedAccount);
  });

  it('reads "Deleted Account" on both sides of a transfer between two deleted accounts', () => {
    expect(
      buildTransactionRowPresentation({
        tx: transaction({
          type: TransactionType.Transfer,
          account_id: deletedSource.id,
          to_account_id: deletedTarget.id,
          category_id: null,
        }),
        account: deletedSource,
        toAccount: deletedTarget,
      }).context,
    ).toBe(`${Strings.deletedAccount} → ${Strings.deletedAccount}`);
  });

  it('keeps the card-credit branch, with the deleted card named by the label', () => {
    const deletedCard = account({
      id: 'gone-card',
      name: '',
      type: AccountType.CreditCard,
      is_archived: 1,
      is_deleted: 1,
    });

    expect(
      buildTransactionRowPresentation({
        tx: transaction({ type: TransactionType.Income, account_id: deletedCard.id }),
        account: deletedCard,
        category,
      }),
    ).toMatchObject({
      title: Strings.cardCreditTitle,
      context: `Food & Dining · ${Strings.deletedAccount}`,
    });
  });
});

describe('transaction row track geometry', () => {
  it('keeps both columns inside the row box', () => {
    // The row's own `border-b` comes out of the content box alongside the padding.
    const innerBox = TRANSACTION_ROW_HEIGHT - 2 * TRANSACTION_ROW_VERTICAL_PADDING - 1;
    const valueColumn =
      lineHeightFor(Type.body) +
      TRANSACTION_ROW_SECONDARY_AMOUNT_TRACK_HEIGHT +
      lineHeightFor(Type.overline);
    const contentColumn =
      Math.max(lineHeightFor(Type.meta), TRANSACTION_ROW_TITLE_BADGE_HEIGHT) +
      TRANSACTION_ROW_CONTEXT_GAP +
      lineHeightFor(Type.overline) +
      TRANSACTION_ROW_NOTE_TRACK_HEIGHT;

    expect(valueColumn).toBeLessThanOrEqual(innerBox);
    expect(contentColumn).toBeLessThanOrEqual(innerBox);
  });
});
