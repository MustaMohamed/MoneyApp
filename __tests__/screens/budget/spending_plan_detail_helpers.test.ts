import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { SpendingPlanWithCategories } from '@/modules/budget/entities/budget.entity';
import {
  buildPlanSpendingCard,
  resolveSpendingPlanDetailViewState,
  spendingPlanDetailShowsBody,
  type SpendingPlanDetailViewState,
} from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.helpers';
import { buildSpendingPlanRows } from '@/modules/budget/screens/budget/spending_plans.helpers';
import type {
  SpendingPlanDetailCategoryVM,
  SpendingPlanRowVM,
} from '@/modules/budget/screens/budget/spending_plans.types';
import type { Category } from '@/modules/categories/entities/category.entity';
import {
  buildTransactionRowPresentation,
  primaryAmountFor,
  resolveCategoryGlyph,
  TRANSACTION_ROW_CAPTION_SEPARATOR,
} from '@/modules/transactions/components/transaction_row.helpers';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { makeTestAccount, makeTestCategory, makeTestTransaction } from '@/test_helpers/transaction';
import { PLUS_SIGN } from '@/utils/format_amount';
import { formatShortWeekdayDate } from '@/utils/format_date';

describe('resolveSpendingPlanDetailViewState', () => {
  it('reads loading for a status another load owns when no plan is held', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: false,
        ownsStatus: false,
        status: 'ready',
        refreshError: false,
      }),
    ).toBe('loading');
  });

  it('keeps a held plan ready while the status belongs to another load', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: true,
        ownsStatus: false,
        status: 'firstLoadError',
        refreshError: true,
      }),
    ).toBe('ready');
  });

  it('reads loading on an owned load with no plan, and ready with one', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: false,
        ownsStatus: true,
        status: 'loading',
        refreshError: false,
      }),
    ).toBe('loading');
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: true,
        ownsStatus: true,
        status: 'loading',
        refreshError: false,
      }),
    ).toBe('ready');
  });

  it('reads firstLoadError with no plan and refreshErrorWithData with one', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: false,
        ownsStatus: true,
        status: 'firstLoadError',
        refreshError: false,
      }),
    ).toBe('firstLoadError');
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: true,
        ownsStatus: true,
        status: 'firstLoadError',
        refreshError: false,
      }),
    ).toBe('refreshErrorWithData');
  });

  it('reads notFound for a settled load with no plan', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: false,
        ownsStatus: true,
        status: 'ready',
        refreshError: false,
      }),
    ).toBe('notFound');
  });

  it('reads refreshErrorWithData for a held plan whose refresh failed', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: true,
        ownsStatus: true,
        status: 'ready',
        refreshError: true,
      }),
    ).toBe('refreshErrorWithData');
  });

  it('reads ready for a held plan with no refresh error', () => {
    expect(
      resolveSpendingPlanDetailViewState({
        hasPlan: true,
        ownsStatus: true,
        status: 'ready',
        refreshError: false,
      }),
    ).toBe('ready');
  });
});

describe('spendingPlanDetailShowsBody', () => {
  it('shows the body for ready and refreshErrorWithData only', () => {
    const states: SpendingPlanDetailViewState[] = [
      'loading',
      'notFound',
      'firstLoadError',
      'refreshErrorWithData',
      'ready',
    ];

    expect(states.filter(spendingPlanDetailShowsBody)).toEqual(['refreshErrorWithData', 'ready']);
  });
});

const TODAY = '2026-11-20';
const SHOPPING = makeTestCategory({ id: 'cat_shopping', name: 'Shopping', icon: 'shopping' });
const DINING = makeTestCategory({ id: 'cat_dining', name: 'Dining Out', icon: 'silverware' });
const TRANSPORT = makeTestCategory({ id: 'cat_transport', name: 'Transport', icon: 'bus' });
const WALLET = makeTestAccount({ id: 'acc_wallet', type: AccountType.PhysicalWallet });
const CARD = makeTestAccount({ id: 'acc_card', name: 'Card', type: AccountType.CreditCard });
const USD_BANK = makeTestAccount({
  id: 'acc_usd',
  name: 'USD bank',
  type: AccountType.Bank,
  currency: Currency.USD,
});

const ACCOUNTS_BY_ID: ReadonlyMap<string, Account> = new Map(
  [WALLET, CARD, USD_BANK].map((account) => [account.id, account]),
);
const CATEGORIES_BY_ID: ReadonlyMap<string, Category> = new Map(
  [SHOPPING, DINING, TRANSPORT].map((category) => [category.id, category]),
);

type PlanInput = Pick<SpendingPlanRowVM, 'spent' | 'startDate' | 'timing' | 'detailCategoryRows'>;

function detailCategory(category: Category): SpendingPlanDetailCategoryVM {
  return {
    categoryId: category.id,
    categoryName: category.name,
    icon: category.icon,
    color: category.color,
    spent: 0,
    isOver: false,
    isWarning: false,
  };
}

function planInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    spent: 3900,
    startDate: '2026-11-12',
    timing: { lifecycle: 'active', totalDays: 7, elapsedDays: 3, daysValue: 4 },
    detailCategoryRows: [detailCategory(SHOPPING), detailCategory(DINING)],
    ...overrides,
  };
}

function expense(overrides: Partial<Transaction>): Transaction {
  return makeTestTransaction({
    account_id: WALLET.id,
    category_id: SHOPPING.id,
    transaction_date: '2026-11-13',
    ...overrides,
  });
}

function card(transactions: Transaction[], plan: PlanInput = planInput()) {
  return buildPlanSpendingCard({
    plan,
    transactions,
    accountsById: ACCOUNTS_BY_ID,
    categoriesById: CATEGORIES_BY_ID,
    today: TODAY,
  });
}

function onlyRow(transaction: Transaction) {
  const rows = card([transaction]).rows;
  expect(rows).toHaveLength(1);
  return rows[0].presentation;
}

describe('buildPlanSpendingCard', () => {
  it('keeps the rows in the order the read returned them', () => {
    const result = card([
      expense({ id: 'tx_b', transaction_date: '2026-11-12' }),
      expense({ id: 'tx_c', transaction_date: '2026-11-15' }),
      expense({ id: 'tx_a', transaction_date: '2026-11-13' }),
    ]);

    expect(result.rows.map((row) => row.id)).toEqual(['tx_b', 'tx_c', 'tx_a']);
    expect(result.count).toBe(3);
    expect(result.emptyNote).toBeUndefined();
  });

  it('titles a row with a blank or whitespace note by its category name', () => {
    const result = card([
      expense({ id: 'tx_null', note: null, category_id: DINING.id }),
      expense({ id: 'tx_empty', note: '', category_id: TRANSPORT.id }),
      expense({ id: 'tx_space', note: '   ', category_id: SHOPPING.id }),
    ]);

    expect(result.rows.map((row) => row.presentation.title)).toEqual([
      DINING.name,
      TRANSPORT.name,
      SHOPPING.name,
    ]);
  });

  it('titles a row with a non-blank note by that note', () => {
    expect(onlyRow(expense({ note: 'Bibliotheca gift shop' })).title).toBe('Bibliotheca gift shop');
  });

  it("draws a card credit's amount as the transactions list does, with the category's glyph", () => {
    const credit = expense({
      id: 'tx_credit',
      type: TransactionType.Income,
      account_id: CARD.id,
      category_id: SHOPPING.id,
      amount: 250,
      egp_amount: 250,
    });
    const listed = buildTransactionRowPresentation({
      tx: credit,
      account: CARD,
      category: SHOPPING,
    });

    const row = onlyRow(credit);

    expect(row.primaryAmount.startsWith(PLUS_SIGN)).toBe(true);
    expect(row.primaryAmount).toBe(listed.primaryAmount);
    expect(row.amountClassName).toBe(listed.amountClassName);
    expect(row.tiles).toEqual(listed.tiles);
    expect({ glyphName: row.glyphName, glyphColor: row.glyphColor }).toEqual(
      resolveCategoryGlyph(SHOPPING),
    );
    expect(row.title).toBe(SHOPPING.name);
  });

  it('keeps a USD expense in its own amount and code with the EGP secondary line', () => {
    const usd = expense({
      id: 'tx_usd',
      account_id: USD_BANK.id,
      category_id: DINING.id,
      currency: Currency.USD,
      amount: 12.5,
      egp_amount: 600,
      exchange_rate: 48,
    });
    const listed = buildTransactionRowPresentation({
      tx: usd,
      account: USD_BANK,
      category: DINING,
    });

    const row = onlyRow(usd);

    expect(row.primaryAmount).toBe(listed.primaryAmount);
    expect(row.secondaryLine).toBe(listed.secondaryLine);
    expect(row.secondaryLine.startsWith('≈ ')).toBe(true);
  });

  it("totals the card with the hero's Spent figure, not a sum of its rows", () => {
    const plan: SpendingPlanWithCategories = {
      id: 'plan_trip',
      name: 'Alexandria trip',
      start_date: '2026-11-12',
      end_date: '2026-11-18',
      total_amount: 8000,
      created_at: '',
      updated_at: '',
      categories: [
        { plan_id: 'plan_trip', category_id: SHOPPING.id, allocated_amount: 3000 },
        { plan_id: 'plan_trip', category_id: DINING.id, allocated_amount: null },
      ],
    };
    const [row] = buildSpendingPlanRows({
      plans: [plan],
      categories: [SHOPPING, DINING],
      spendByPlanId: { plan_trip: { [SHOPPING.id]: 1500, [DINING.id]: 2400 } },
      selectedMonth: '2026-11',
      today: TODAY,
    });
    const heroSpent = row.detail.hero.figures?.find(
      (figure) => figure.label === Strings.budgetPlansSummarySpent,
    );
    if (heroSpent === undefined) throw new Error('Expected the hero Spent figure');

    const result = card(
      [
        expense({ id: 'tx_1', amount: 700, egp_amount: 700 }),
        expense({ id: 'tx_2', amount: 300, egp_amount: 300, category_id: DINING.id }),
      ],
      row,
    );

    expect(result.totalLabel.startsWith(heroSpent.value)).toBe(true);
    expect(result.totalLabel.startsWith('1,000')).toBe(false);
    expect(result.count).toBe(2);
  });

  it('notes an empty card of a one-category plan with that category and the start date', () => {
    const plan = planInput({
      spent: 0,
      startDate: '2026-11-16',
      timing: { lifecycle: 'upcoming', totalDays: 5, elapsedDays: 0, daysValue: 3 },
      detailCategoryRows: [detailCategory(TRANSPORT)],
    });

    const result = card([], plan);

    expect(result.rows).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.emptyNote).toBe(
      Strings.budgetPlansDetailSpendingEmptyOne(
        TRANSPORT.name,
        formatShortWeekdayDate('2026-11-16', TODAY),
      ),
    );
  });

  it('notes an empty card whose only category is gone from the store as uncategorized, never its id', () => {
    const gone = makeTestCategory({ id: 'cat_gone', name: 'Gone' });
    const plan = planInput({
      spent: 0,
      startDate: '2026-11-16',
      timing: { lifecycle: 'upcoming', totalDays: 5, elapsedDays: 0, daysValue: 3 },
      detailCategoryRows: [{ ...detailCategory(gone), categoryName: gone.id }],
    });

    const note = card([], plan).emptyNote;

    expect(note).toBe(
      Strings.budgetPlansDetailSpendingEmptyOne(
        Strings.uncategorized,
        formatShortWeekdayDate('2026-11-16', TODAY),
      ),
    );
    expect(note).not.toContain(gone.id);
  });

  it('notes an empty card of a two-category plan with the category count', () => {
    const plan = planInput({ spent: 0, startDate: '2026-11-16' });

    expect(card([], plan).emptyNote).toBe(
      Strings.budgetPlansDetailSpendingEmptyMany(2, formatShortWeekdayDate('2026-11-16', TODAY)),
    );
  });

  it('notes an empty card of an ended plan with the ended note', () => {
    const plan = planInput({
      spent: 0,
      timing: { lifecycle: 'completed', totalDays: 7, elapsedDays: 7, daysValue: 2 },
      detailCategoryRows: [detailCategory(TRANSPORT)],
    });

    expect(card([], plan).emptyNote).toBe(Strings.budgetPlansDetailSpendingEmptyEnded);
  });

  it('captions a row with its date, the caption separator and its category name', () => {
    const row = onlyRow(expense({ transaction_date: '2026-11-13', category_id: SHOPPING.id }));

    expect(row.caption).toBe(`Fri 13 Nov${TRANSACTION_ROW_CAPTION_SEPARATOR}Shopping`);
  });

  it("carries the year on a row dated in another year than today's", () => {
    const row = onlyRow(expense({ transaction_date: '2025-12-30', category_id: SHOPPING.id }));

    expect(row.caption).toBe(
      `${formatShortWeekdayDate('2025-12-30', TODAY)}${TRANSACTION_ROW_CAPTION_SEPARATOR}${SHOPPING.name}`,
    );
    expect(row.caption).toContain('2025');
  });

  it('speaks an EGP row and a USD row through the row label string, each with its own code', () => {
    const egp = expense({
      id: 'tx_egp',
      note: 'Fish Market',
      category_id: DINING.id,
      amount: 1100,
    });
    const usd = expense({
      id: 'tx_usd',
      note: 'Duty free',
      account_id: USD_BANK.id,
      category_id: SHOPPING.id,
      currency: Currency.USD,
      amount: 12.5,
      egp_amount: 600,
      exchange_rate: 48,
      transaction_date: '2026-11-14',
    });

    const [egpRow, usdRow] = card([egp, usd]).rows.map((row) => row.presentation);

    expect(egpRow.accessibilityLabel).toBe(
      Strings.budgetPlansDetailSpendingRowA11y(
        'Fish Market',
        primaryAmountFor(egp, false).withCode,
        formatShortWeekdayDate(egp.transaction_date, TODAY),
        DINING.name,
      ),
    );
    expect(usdRow.accessibilityLabel).toBe(
      Strings.budgetPlansDetailSpendingRowA11y(
        'Duty free',
        primaryAmountFor(usd, false).withCode,
        formatShortWeekdayDate(usd.transaction_date, TODAY),
        SHOPPING.name,
      ),
    );
    expect(usdRow.accessibilityLabel).toContain('USD');
    expect(usdRow.accessibilityLabel).not.toContain('EGP');
  });
});
