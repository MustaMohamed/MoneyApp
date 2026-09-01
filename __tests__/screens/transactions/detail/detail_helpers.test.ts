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
import { formatCurrencyAmount } from '@/utils/format_amount';

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
  // Mirrors the account-type to glyph mapping in the dashboard's `account_card.tsx`.
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
    // A transaction referencing an account that no longer exists yields undefined from the lookup.
    expect(getAccountTypeIcon(undefined)).toBe('card-bulleted-outline');
  });

  it('falls back to "card-bulleted-outline" for unknown values', () => {
    // CHECK constraints aside, legacy rows from an older enum could still reach here.
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
  // The pair is what `TransferFlowCard` renders, not a recomputation it can diverge from.
  it('exposes native send and receive values for a transfer, as the rendered display/accessible pair', () => {
    const source = account({ currency: Currency.EGP });
    const destination = account({
      id: 'destination',
      name: 'Chase',
      currency: Currency.USD,
    });

    expect(
      buildTransactionDetailPresentation({
        tx: transaction({
          currency: Currency.EGP,
          amount: 0.4,
          egp_amount: 0.4,
          to_amount: 19.4,
        }),
        account: source,
        toAccount: destination,
      }).transferFlow,
    ).toMatchObject({
      fromAmountText: { display: '−0.40 EGP', accessible: '0.40 EGP' },
      toAmountText: { display: '+19.40 USD', accessible: '19.40 USD' },
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

  it('renders the USD original amount at the config default', () => {
    const { originalAmountText } = buildTransactionDetailPresentation({
      tx: transaction({ amount: 1200 }),
      account: account({ currency: Currency.USD }),
    });
    expect(originalAmountText).toBe('1,200.00 USD');
  });

  // The sign is composed, so `formatAmount`'s -0 guard never sees a rounded-away magnitude.
  it('escalates to 2dp rather than print a sign beside a rounded-away magnitude', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({ type: TransactionType.Expense, egp_amount: 0.4 }),
        account: account({}),
      }).amountText,
    ).toBe('−0.40 EGP');
  });

  it('does not escalate once the site precision would print a nonzero digit', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({ type: TransactionType.Expense, egp_amount: 0.6 }),
        account: account({}),
      }).amountText,
    ).toBe('−1 EGP');
  });

  // Pins the #318 delegation's third branch: a transfer takes the unsigned accessible text.
  it('leaves a transfer amount unsigned', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({}),
        account: account({}),
      }),
    ).toMatchObject({ amountText: '4,850 EGP' });
  });

  it('keeps the rate at 2dp regardless of the EGP amount default — the tripwire that would catch a find-and-replace onto formatCurrencyAmount', () => {
    const { exchangeRateText } = buildTransactionDetailPresentation({
      tx: transaction({ exchange_rate: 48.6 }),
      account: account({ currency: Currency.USD }),
    });
    expect(exchangeRateText).toBe('1 USD = 48.60 EGP');
    // `formatCurrencyAmount` gives EGP 0dp, the wrong decimals for a rate; this pins that.
    expect(formatCurrencyAmount(48.6, Currency.EGP)).toBe('49 EGP');
  });
});
