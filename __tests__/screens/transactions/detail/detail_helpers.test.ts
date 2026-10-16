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
import { buildTransactionRowPresentation } from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import {
  buildTransactionDetailPresentation,
  getAccountTypeIcon,
  getCommitmentPaymentRoute,
  resolveDetailViewState,
  resolveHeroTileGlyphColor,
  type TransactionDetailPresentationInput,
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
        amountAccessibilityLabel: '+250 EGP',
        amountValue: '+250',
        typeColor: InfoTokens[500],
      },
    });
  });

  // The sign is composed, so `formatAmount`'s -0 guard never sees a rounded-away magnitude.
  it('escalates to 2dp rather than print a sign beside a rounded-away magnitude', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({
          type: TransactionType.Expense,
          currency: Currency.EGP,
          amount: 0.4,
          egp_amount: 0.4,
          exchange_rate: null,
          to_account_id: null,
          to_amount: null,
        }),
        account: account({ currency: Currency.EGP }),
      }).hero,
    ).toMatchObject({ amountAccessibilityLabel: '−0.40 EGP', amountValue: '−0.40' });
  });

  it('does not escalate once the site precision would print a nonzero digit', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({
          type: TransactionType.Expense,
          currency: Currency.EGP,
          amount: 0.6,
          egp_amount: 0.6,
          exchange_rate: null,
          to_account_id: null,
          to_amount: null,
        }),
        account: account({ currency: Currency.EGP }),
      }).hero,
    ).toMatchObject({ amountAccessibilityLabel: '−1 EGP', amountValue: '−1' });
  });

  // Pins the #318 delegation's third branch: a transfer takes the unsigned accessible text.
  it('leaves a transfer amount unsigned', () => {
    expect(
      buildTransactionDetailPresentation({
        tx: transaction({
          currency: Currency.EGP,
          amount: 4_850,
          egp_amount: 4_850,
          exchange_rate: null,
          to_amount: 4_850,
        }),
        account: account({ currency: Currency.EGP }),
      }).hero,
    ).toMatchObject({ amountAccessibilityLabel: '4,850 EGP', amountValue: '4,850' });
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
      amountAccessibilityLabel: '−1,240 EGP',
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
      amountAccessibilityLabel: '5,000 EGP',
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

describe('buildTransactionDetailPresentation — amount in its own currency (MA-192)', () => {
  const RATE = 49;
  const egpAccount = account({ name: 'CIB', currency: Currency.EGP });
  const usdAccount = account({ name: 'Chase', currency: Currency.USD });

  function single(
    type: TransactionType.Expense | TransactionType.Income,
    currency: Currency,
    overrides: Partial<Transaction> = {},
  ): Transaction {
    const usd = currency === Currency.USD;
    return transaction({
      type,
      currency,
      amount: usd ? 15 : 1_240,
      egp_amount: usd ? 735 : 1_240,
      exchange_rate: usd ? RATE : null,
      to_account_id: null,
      to_amount: null,
      ...overrides,
    });
  }

  // Each pair at rate 49: EGP 5,000 arrives as USD 102.04, USD 100 counts as EGP 4,900.
  function twoAccount(
    type: TransactionType.Transfer | TransactionType.CCPayment,
    from: Currency,
    to: Currency,
  ): TransactionDetailPresentationInput {
    const fromUsd = from === Currency.USD;
    const toUsd = to === Currency.USD;
    const toAmount = fromUsd ? (toUsd ? 100 : 4_900) : toUsd ? 102.04 : 5_000;
    return {
      tx: transaction({
        type,
        currency: from,
        amount: fromUsd ? 100 : 5_000,
        egp_amount: fromUsd ? 4_900 : 5_000,
        exchange_rate: fromUsd || toUsd ? RATE : null,
        to_amount: toAmount,
      }),
      account: fromUsd ? usdAccount : egpAccount,
      toAccount: account({
        id: 'destination',
        name: 'Destination',
        type: type === TransactionType.CCPayment ? AccountType.CreditCard : AccountType.Bank,
        currency: to,
      }),
    };
  }

  // A commitment's payment toward a USD commitment from an EGP account: a rate, no USD leg.
  const commitmentPayment = single(TransactionType.Expense, Currency.EGP, {
    amount: 735,
    egp_amount: 735,
    exchange_rate: RATE,
    commitment_payment_id: 'payment',
  });

  describe('the hero', () => {
    it('frame C5: a USD 15 expense heroes −15.00 USD, not its EGP amount', () => {
      expect(
        buildTransactionDetailPresentation({
          tx: single(TransactionType.Expense, Currency.USD),
          account: usdAccount,
        }).hero,
      ).toMatchObject({
        amountValue: '−15.00',
        amountCode: 'USD',
        amountAccessibilityLabel: '−15.00 USD',
      });
    });

    it.each([
      ['a USD 100 transfer to EGP', TransactionType.Transfer],
      ['a USD 100 card payment to an EGP card', TransactionType.CCPayment],
    ] as const)('%s heroes 100.00 USD, unsigned', (_name, type) => {
      expect(
        buildTransactionDetailPresentation(twoAccount(type, Currency.USD, Currency.EGP)).hero,
      ).toMatchObject({
        amountValue: '100.00',
        amountCode: 'USD',
        amountAccessibilityLabel: '100.00 USD',
      });
    });

    it('prints the list row primary amount for every type and currency pair', () => {
      const cardCredit = (currency: Currency): TransactionDetailPresentationInput => ({
        tx: single(TransactionType.Income, currency),
        account: account({ type: AccountType.CreditCard, currency }),
      });
      const inputs: Record<string, TransactionDetailPresentationInput> = {
        egpExpense: { tx: single(TransactionType.Expense, Currency.EGP), account: egpAccount },
        usdExpense: { tx: single(TransactionType.Expense, Currency.USD), account: usdAccount },
        egpIncome: { tx: single(TransactionType.Income, Currency.EGP), account: egpAccount },
        usdIncome: { tx: single(TransactionType.Income, Currency.USD), account: usdAccount },
        egpCardCredit: cardCredit(Currency.EGP),
        usdCardCredit: cardCredit(Currency.USD),
      };
      for (const type of [TransactionType.Transfer, TransactionType.CCPayment] as const) {
        for (const from of [Currency.EGP, Currency.USD]) {
          for (const to of [Currency.EGP, Currency.USD]) {
            inputs[`${type} ${from} to ${to}`] = twoAccount(type, from, to);
          }
        }
      }
      const hero = Object.fromEntries(
        Object.entries(inputs).map(([name, input]) => [
          name,
          buildTransactionDetailPresentation(input).hero.amountValue,
        ]),
      );
      const row = Object.fromEntries(
        Object.entries(inputs).map(([name, input]) => [
          name,
          buildTransactionRowPresentation(input).primaryAmount,
        ]),
      );

      expect(hero).toEqual(row);
    });
  });

  describe('the Amount in EGP and Amount in USD rows', () => {
    it('frame C5: a USD 15 expense shows Amount in EGP 735 EGP beside its rate, and the same row with no rate stored', () => {
      const rated = buildTransactionDetailPresentation({
        tx: single(TransactionType.Expense, Currency.USD),
        account: usdAccount,
      });
      const unrated = buildTransactionDetailPresentation({
        tx: single(TransactionType.Expense, Currency.USD, { exchange_rate: null }),
        account: usdAccount,
      });

      expect(rated.amountRow).toEqual({ label: 'Amount in EGP', value: '735 EGP' });
      expect(rated.exchangeRateText).toBe('1 USD = 49.00 EGP');
      expect(unrated.amountRow).toEqual({ label: 'Amount in EGP', value: '735 EGP' });
    });

    it.each([
      ['a transfer to EGP', TransactionType.Transfer, Currency.EGP],
      ['a transfer to USD', TransactionType.Transfer, Currency.USD],
      ['a card payment to an EGP card', TransactionType.CCPayment, Currency.EGP],
      ['a card payment to a USD card', TransactionType.CCPayment, Currency.USD],
    ] as const)('USD 100 sent as %s shows Amount in EGP 4,900 EGP', (_name, type, to) => {
      expect(
        buildTransactionDetailPresentation(twoAccount(type, Currency.USD, to)).amountRow,
      ).toEqual({ label: 'Amount in EGP', value: '4,900 EGP' });
    });

    it.each([
      ['a transfer, destination resolved', TransactionType.Transfer, true],
      ['a transfer, destination not resolved', TransactionType.Transfer, false],
      ['a card payment, destination resolved', TransactionType.CCPayment, true],
      ['a card payment, destination not resolved', TransactionType.CCPayment, false],
    ] as const)(
      'EGP 5,000 sent to USD as %s shows Amount in USD 102.04 USD',
      (_name, type, resolved) => {
        const input = twoAccount(type, Currency.EGP, Currency.USD);

        expect(
          buildTransactionDetailPresentation({
            ...input,
            toAccount: resolved ? input.toAccount : undefined,
          }).amountRow,
        ).toEqual({ label: 'Amount in USD', value: '102.04 USD' });
      },
    );

    it('an EGP transaction shows an amount row only when it sends to USD', () => {
      const rows = {
        expense: buildTransactionDetailPresentation({
          tx: single(TransactionType.Expense, Currency.EGP),
          account: egpAccount,
        }).amountRow,
        income: buildTransactionDetailPresentation({
          tx: single(TransactionType.Income, Currency.EGP),
          account: egpAccount,
        }).amountRow,
        transferToEgp: buildTransactionDetailPresentation(
          twoAccount(TransactionType.Transfer, Currency.EGP, Currency.EGP),
        ).amountRow,
        cardPaymentToEgp: buildTransactionDetailPresentation(
          twoAccount(TransactionType.CCPayment, Currency.EGP, Currency.EGP),
        ).amountRow,
        transferToUsd: buildTransactionDetailPresentation(
          twoAccount(TransactionType.Transfer, Currency.EGP, Currency.USD),
        ).amountRow,
        cardPaymentToUsd: buildTransactionDetailPresentation(
          twoAccount(TransactionType.CCPayment, Currency.EGP, Currency.USD),
        ).amountRow,
      };
      const arrived = { label: 'Amount in USD', value: '102.04 USD' };

      expect(rows).toEqual({
        expense: undefined,
        income: undefined,
        transferToEgp: undefined,
        cardPaymentToEgp: undefined,
        transferToUsd: arrived,
        cardPaymentToUsd: arrived,
      });
    });

    it('a commitment payment in EGP at rate 49 shows its Rate row alone, where an EGP transfer to USD at that rate adds Amount in USD', () => {
      const payment = buildTransactionDetailPresentation({
        tx: commitmentPayment,
        account: egpAccount,
      });
      const transfer = buildTransactionDetailPresentation(
        twoAccount(TransactionType.Transfer, Currency.EGP, Currency.USD),
      );

      expect(payment.amountRow).toBeUndefined();
      expect(payment.exchangeRateText).toBe('1 USD = 49.00 EGP');
      expect(payment.hero).toMatchObject({ amountValue: '−735', amountCode: 'EGP' });
      expect(transfer.exchangeRateText).toBe('1 USD = 49.00 EGP');
      expect(transfer.amountRow).toEqual({ label: 'Amount in USD', value: '102.04 USD' });
    });

    it('prints a USD 0.01 expense at rate 49 as Amount in EGP 0.49 EGP, escalated past 0 dp', () => {
      expect(
        buildTransactionDetailPresentation({
          tx: single(TransactionType.Expense, Currency.USD, { amount: 0.01, egp_amount: 0.49 }),
          account: usdAccount,
        }).amountRow,
      ).toEqual({ label: 'Amount in EGP', value: '0.49 EGP' });
    });
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
