import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CategoryColors } from '@/constants/theme';
import {
  AccentCCTokens,
  CoreTokens,
  GoldTokens,
  InfoTokens,
  SemanticTokens,
} from '@/constants/theme_tokens';
import { resolveAccountBadgeColors } from '@/modules/accounts/constants/account_badge_color';
import { contrastRatio } from '@/modules/accounts/constants/account_palette';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { STACKED_PREFIX } from '@/modules/navigation/domain/stacked_route';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  buildTransactionDetailPresentation,
  getAccountTypeIcon,
  getCommitmentPaymentRoute,
  resolveDetailViewState,
  resolveHeroTileGlyphColor,
} from '@/modules/transactions/screens/transactions/detail/detail.helpers';
import type { TransactionDetailStatus } from '@/modules/transactions/screens/transactions/detail/detail.state';
import { makeTestCategory } from '@/test_helpers/transaction';
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
    is_deleted: 0,
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
  it('opens the stacked twin above the tabs and marks the tabbed origin copy', () => {
    expect(getCommitmentPaymentRoute('payment-1', '', 'tx-1')).toBe(
      '/stacked/commitments/payment-1?originTxId=tx-1&originTxCopy=tabbed',
    );
  });

  it('opens the stacked twin with the origin transaction from a stacked transaction', () => {
    expect(getCommitmentPaymentRoute('payment-1', STACKED_PREFIX, 'tx-1')).toBe(
      '/stacked/commitments/payment-1?originTxId=tx-1',
    );
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
      categoryBadge: Strings.cardCreditTitle,
      categoryBadgeTone: 'info',
      hero: {
        title: Strings.cardCreditTitle,
        amountText: '+250 EGP',
        amountValue: '+250',
        typeColor: InfoTokens[500],
      },
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
      }).hero,
    ).toMatchObject({ amountText: '−0.40 EGP', amountValue: '−0.40' });
  });

  it('does not escalate once the site precision would print a nonzero digit', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({ type: TransactionType.Expense, egp_amount: 0.6 }),
        account: account({}),
      }).hero,
    ).toMatchObject({ amountText: '−1 EGP', amountValue: '−1' });
  });

  // Pins the #318 delegation's third branch: a transfer takes the unsigned accessible text.
  it('leaves a transfer amount unsigned', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({}),
        account: account({}),
      }).hero,
    ).toMatchObject({ amountText: '4,850 EGP', amountValue: '4,850' });
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

describe('buildTransactionDetailPresentation — hero (MA-180)', () => {
  const egpAccount = account({ name: 'CIB', currency: Currency.EGP });
  const egpDestination = account({ id: 'destination', name: 'Wallet', currency: Currency.EGP });
  const card = account({
    id: 'destination',
    name: 'Visa',
    type: AccountType.CreditCard,
    currency: Currency.EGP,
  });
  const groceries = makeTestCategory({ name: 'Groceries', color: '#5C7FC4', icon: 'cart' });
  const salary = makeTestCategory({
    id: 'salary',
    name: 'Salary',
    type: CategoryType.Income,
    color: '#478D6E',
    icon: 'briefcase',
  });

  // Frame C1's moment: Tue 22 Sep 2026, 6:40 PM.
  function egp(overrides: Partial<Transaction>): Transaction {
    return transaction({
      currency: Currency.EGP,
      exchange_rate: null,
      to_account_id: null,
      to_amount: null,
      transaction_date: '2026-09-22',
      transaction_time: '18:40:00',
      ...overrides,
    });
  }

  const expenseInput = {
    tx: egp({
      type: TransactionType.Expense,
      amount: 1_240,
      egp_amount: 1_240,
      category_id: groceries.id,
    }),
    account: egpAccount,
    category: groceries,
  };
  const incomeInput = {
    tx: egp({
      type: TransactionType.Income,
      amount: 22_300,
      egp_amount: 22_300,
      category_id: salary.id,
    }),
    account: egpAccount,
    category: salary,
  };
  const transferInput = {
    tx: egp({ amount: 5_000, egp_amount: 5_000, to_account_id: 'destination', to_amount: 5_000 }),
    account: egpAccount,
    toAccount: egpDestination,
  };
  const cardPaymentInput = {
    tx: egp({
      type: TransactionType.CCPayment,
      amount: 5_000,
      egp_amount: 5_000,
      to_account_id: 'destination',
      to_amount: 5_000,
    }),
    account: egpAccount,
    toAccount: card,
  };
  const cardCreditInput = {
    tx: egp({ type: TransactionType.Income, amount: 3_120, egp_amount: 3_120 }),
    account: account({ type: AccountType.CreditCard, currency: Currency.EGP }),
  };

  it('frame C1: an expense heroes its category, the Expense badge, the signed EGP amount and the weekday caption', () => {
    const badge = resolveAccountBadgeColors(SemanticTokens.negative);
    const presentation = buildTransactionDetailPresentation(expenseInput);

    expect(presentation.hero).toEqual({
      title: 'Groceries',
      typeLabel: 'Expense',
      typeIcon: 'arrow-up',
      typeColor: SemanticTokens.negative,
      badgeFill: badge.fill,
      badgeForeground: badge.foreground,
      tileColor: '#5C7FC4',
      tileGlyph: 'cart',
      tileGlyphColor: CoreTokens.text1,
      amountValue: '−1,240',
      amountCode: 'EGP',
      amountText: '−1,240 EGP',
      caption: 'Tue 22 Sep 2026, 6:40 PM',
    });
    expect(presentation.dateTimeText).toBe('Tue 22 Sep 2026, 6:40 PM');
  });

  it('frame C2: an income takes the Income badge in the success colour, signed plus', () => {
    expect(buildTransactionDetailPresentation(incomeInput).hero).toMatchObject({
      title: 'Salary',
      typeLabel: 'Income',
      typeIcon: 'arrow-down',
      typeColor: SemanticTokens.positive,
      tileColor: '#478D6E',
      tileGlyph: 'briefcase',
      amountValue: '+22,300',
      amountCode: 'EGP',
    });
  });

  it('frame C3: a transfer takes the swap glyph on info blue, unsigned', () => {
    expect(buildTransactionDetailPresentation(transferInput).hero).toMatchObject({
      title: 'Transfer',
      typeLabel: 'Transfer',
      typeIcon: 'swap-horizontal',
      typeColor: InfoTokens[500],
      tileColor: InfoTokens[500],
      tileGlyph: 'swap-horizontal',
      tileGlyphColor: CoreTokens.bg,
      amountValue: '5,000',
      amountText: '5,000 EGP',
      caption: 'Tue 22 Sep 2026, 6:40 PM',
    });
  });

  it('frame C4: a card payment is titled CC Payment, the refund glyph on the card accent, unsigned', () => {
    expect(buildTransactionDetailPresentation(cardPaymentInput).hero).toMatchObject({
      title: 'CC Payment',
      typeLabel: 'CC Payment',
      typeIcon: 'credit-card-refund',
      typeColor: AccentCCTokens[500],
      tileColor: AccentCCTokens[500],
      tileGlyph: 'credit-card-refund',
      tileGlyphColor: CoreTokens.text1,
      amountValue: '5,000',
    });
  });

  it('frame C13: card credit is titled and badged Card credit, the refund glyph on info blue, signed plus', () => {
    const badge = resolveAccountBadgeColors(InfoTokens[500]);

    expect(buildTransactionDetailPresentation(cardCreditInput).hero).toMatchObject({
      title: 'Card credit',
      typeLabel: 'Card credit',
      typeIcon: 'credit-card-refund',
      typeColor: InfoTokens[500],
      badgeFill: badge.fill,
      badgeForeground: badge.foreground,
      tileColor: InfoTokens[500],
      tileGlyph: 'credit-card-refund',
      tileGlyphColor: CoreTokens.bg,
      amountValue: '+3,120',
    });
  });

  it('titles an expense whose category does not resolve Uncategorized, on the gold fallback tile', () => {
    const presentation = buildTransactionDetailPresentation({
      tx: egp({ type: TransactionType.Expense, category_id: 'deleted-category' }),
      account: egpAccount,
    });

    expect(presentation.hero).toMatchObject({
      title: 'Uncategorized',
      tileGlyph: 'shape-outline',
      tileColor: GoldTokens[500],
      tileGlyphColor: CoreTokens.bg,
    });
    expect(presentation.categoryLabel).toBe('Uncategorized');
  });

  it.each([
    ['an expense', expenseInput, 'Groceries'],
    ['an income', incomeInput, 'Salary'],
    ['a transfer', transferInput, 'Transfer'],
    ['a card payment', cardPaymentInput, 'CC Payment'],
    ['card credit', cardCreditInput, 'Card credit'],
  ])('keeps the hero title of %s when it carries a note', (_name, input, title) => {
    const noted = buildTransactionDetailPresentation({
      ...input,
      tx: { ...input.tx, note: 'Dinner with Sam' },
    });

    expect(noted.hero).toMatchObject({ title });
  });

  it('frame C6: a commitment-owned expense heroes as a plain one and names Commitment on its Source row', () => {
    const plain = buildTransactionDetailPresentation(expenseInput);
    const owned = buildTransactionDetailPresentation({
      ...expenseInput,
      tx: { ...expenseInput.tx, commitment_payment_id: 'payment' },
    });

    expect(owned.hero).toMatchObject({ typeLabel: 'Expense' });
    expect(owned.hero).toEqual(plain.hero);
    expect(owned.sourceLabel).toBe(Strings.typeBadgeCommitment);
  });
});

describe('resolveHeroTileGlyphColor', () => {
  it.each([...CategoryColors, GoldTokens[500], InfoTokens[500], AccentCCTokens[500]])(
    'clears 3:1 on the %s tile',
    (fill) => {
      expect(contrastRatio(fill, resolveHeroTileGlyphColor(fill))).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('buildTransactionDetailPresentation — deleted accounts (MA-020)', () => {
  const deletedSource = account({ id: 'source', name: '', is_archived: 1, is_deleted: 1 });

  it('labels a transfer whose destination was deleted', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({}),
        account: account({ name: 'USD wallet' }),
        toAccount: account({ id: 'destination', name: '', is_archived: 1, is_deleted: 1 }),
      }).accountLabel,
    ).toBe(`USD wallet → ${Strings.deletedAccount}`);
  });

  it('labels a transfer whose source was deleted, keeping the live destination named', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({}),
        account: deletedSource,
        toAccount: account({ id: 'destination', name: 'Chase' }),
      }).accountLabel,
    ).toBe(`${Strings.deletedAccount} → Chase`);
  });

  it('labels a single-account transaction on a deleted account', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({
          type: TransactionType.Expense,
          to_account_id: null,
          to_amount: null,
        }),
        account: deletedSource,
      }).accountLabel,
    ).toBe(Strings.deletedAccount);
  });
});

describe('buildTransactionDetailPresentation — blank-named accounts (MA-062)', () => {
  it('labels a transfer whose destination has a blank name', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({}),
        account: account({ name: 'USD wallet' }),
        toAccount: account({ id: 'destination', name: '' }),
      }).accountLabel,
    ).toBe(`USD wallet → ${Strings.unnamedAccount}`);
  });

  it('labels a single-account transaction on a blank-named account', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({
          type: TransactionType.Expense,
          to_account_id: null,
          to_amount: null,
        }),
        account: account({ name: '' }),
      }).accountLabel,
    ).toBe(Strings.unnamedAccount);
  });
});
