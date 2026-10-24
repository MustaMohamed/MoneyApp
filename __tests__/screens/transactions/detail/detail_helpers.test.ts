import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CategoryColors } from '@/constants/theme';
import {
  AccentCCTokens,
  AcctTokens,
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
import { buildTransactionRowPresentation } from '@/modules/transactions/components/transaction_row.helpers';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  buildDetailSkeletonGeometry,
  type DetailFactKind,
} from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';
import {
  buildTransactionDetailPresentation,
  getCommitmentPaymentRoute,
  resolveDetailAccountRow,
  resolveDetailActionBarCount,
  resolveDetailActionSet,
  resolveDetailViewState,
  resolveHeroTileGlyphColor,
  resolveTransferFlowView,
  type DetailFact,
  type TransactionDetailPresentation,
  type TransactionDetailPresentationInput,
  type TransferFlow,
} from '@/modules/transactions/screens/transactions/detail/detail.helpers';
import type { TransactionDetailStatus } from '@/modules/transactions/screens/transactions/detail/detail.state';
import { makeTestCategory } from '@/test_helpers/transaction';
import { formatCurrencyAmount } from '@/utils/format_amount';

// The presentation exposes its rows as `facts` alone; this reads one back by kind.
function factOf(
  presentation: TransactionDetailPresentation | null | undefined,
  kind: DetailFactKind,
): DetailFact | undefined {
  return presentation?.facts.find((fact) => fact.kind === kind);
}

function accountRowOf(presentation: TransactionDetailPresentation) {
  const fact = factOf(presentation, 'account');
  if (fact?.leading?.kind !== 'tile') return undefined;
  return {
    name: fact.value,
    tile: fact.leading.tile,
    archived: fact.badge?.label === Strings.detailAccountArchived,
  };
}

function categoryRowOf(presentation: TransactionDetailPresentation) {
  const fact = factOf(presentation, 'category');
  if (fact?.leading?.kind !== 'glyph') return undefined;
  return {
    name: fact.value,
    glyphName: fact.leading.glyphName,
    glyphColor: fact.leading.glyphColor,
  };
}

function amountRowOf(presentation: TransactionDetailPresentation) {
  const fact = factOf(presentation, 'amount');
  return fact && { label: fact.label, value: fact.value };
}

// Manual entry is the Source row's value with no badge; a commitment's payment is the badge alone.
function sourceOf(
  presentation: TransactionDetailPresentation,
): 'manual' | 'commitment' | undefined {
  const fact = factOf(presentation, 'source');
  if (fact?.value === Strings.detailManualSource && fact.badge === undefined) return 'manual';
  if (fact?.value === undefined && fact?.badge?.label === Strings.typeBadgeCommitment) {
    return 'commitment';
  }
  return undefined;
}

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

describe('getCommitmentPaymentRoute', () => {
  it('opens the stacked twin at the commitment and its cycle, marking the tabbed origin copy', () => {
    expect(getCommitmentPaymentRoute('commitment-1', 'payment-1', '', 'tx-1')).toBe(
      '/stacked/commitments/commitment-1?cycle=payment-1&originTxId=tx-1&originTxCopy=tabbed',
    );
  });

  it('opens the stacked twin at the commitment and its cycle from a stacked transaction', () => {
    expect(getCommitmentPaymentRoute('commitment-1', 'payment-1', STACKED_PREFIX, 'tx-1')).toBe(
      '/stacked/commitments/commitment-1?cycle=payment-1&originTxId=tx-1',
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
      from: { amountText: { display: '−0.40 EGP', accessible: '0.40 EGP' } },
      to: { amountText: { display: '+19.40 USD', accessible: '19.40 USD' } },
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

    const presentation = buildTransactionDetailPresentation({
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
    });

    expect(factOf(presentation, 'budget')?.value).toBe('Conference meals');
    expect(sourceOf(presentation)).toBe('commitment');
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
      hero: {
        title: Strings.cardCreditTitle,
        amountAccessibilityLabel: '+250 EGP',
        amountValue: '+250',
        amountColor: InfoTokens[500],
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
    const exchangeRateText = factOf(
      buildTransactionDetailPresentation({
        tx: transaction({ exchange_rate: 48.6 }),
        account: account({ currency: Currency.USD }),
      }),
      'rate',
    )?.value;
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
      badgeLabel: 'Expense',
      badgeIcon: 'arrow-up',
      amountColor: SemanticTokens.negative,
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
    expect(factOf(presentation, 'date')?.value).toBe('Tue 22 Sep 2026');
    expect(factOf(presentation, 'time')?.value).toBe('6:40 PM');
  });

  it('frame C2: an income takes the Income badge in the success colour, signed plus', () => {
    expect(buildTransactionDetailPresentation(incomeInput).hero).toMatchObject({
      title: 'Salary',
      badgeLabel: 'Income',
      badgeIcon: 'arrow-down',
      amountColor: SemanticTokens.positive,
      tileColor: '#478D6E',
      tileGlyph: 'briefcase',
      amountValue: '+22,300',
      amountCode: 'EGP',
    });
  });

  it('frame C3: a transfer takes the swap glyph on info blue, unsigned', () => {
    expect(buildTransactionDetailPresentation(transferInput).hero).toMatchObject({
      title: 'Transfer',
      badgeLabel: 'Transfer',
      badgeIcon: 'swap-horizontal',
      amountColor: InfoTokens[500],
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
      badgeLabel: 'CC Payment',
      badgeIcon: 'credit-card-refund',
      amountColor: AccentCCTokens[500],
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
      badgeLabel: 'Card credit',
      badgeIcon: 'credit-card-refund',
      amountColor: InfoTokens[500],
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
    expect(factOf(presentation, 'category')?.value).toBe('Uncategorized');
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

    expect(owned.hero).toMatchObject({ badgeLabel: 'Expense' });
    expect(owned.hero).toEqual(plain.hero);
    expect(sourceOf(owned)).toBe('commitment');
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

      expect(amountRowOf(rated)).toEqual({ label: 'Amount in EGP', value: '735 EGP' });
      expect(factOf(rated, 'rate')?.value).toBe('1 USD = 49.00 EGP');
      expect(amountRowOf(unrated)).toEqual({ label: 'Amount in EGP', value: '735 EGP' });
    });

    it.each([
      ['a transfer to EGP', TransactionType.Transfer, Currency.EGP],
      ['a transfer to USD', TransactionType.Transfer, Currency.USD],
      ['a card payment to an EGP card', TransactionType.CCPayment, Currency.EGP],
      ['a card payment to a USD card', TransactionType.CCPayment, Currency.USD],
    ] as const)('USD 100 sent as %s shows Amount in EGP 4,900 EGP', (_name, type, to) => {
      expect(
        amountRowOf(buildTransactionDetailPresentation(twoAccount(type, Currency.USD, to))),
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
          amountRowOf(
            buildTransactionDetailPresentation({
              ...input,
              toAccount: resolved ? input.toAccount : undefined,
            }),
          ),
        ).toEqual({ label: 'Amount in USD', value: '102.04 USD' });
      },
    );

    it('an EGP transaction shows an amount row only when it sends to USD', () => {
      const rows = {
        expense: amountRowOf(
          buildTransactionDetailPresentation({
            tx: single(TransactionType.Expense, Currency.EGP),
            account: egpAccount,
          }),
        ),
        income: amountRowOf(
          buildTransactionDetailPresentation({
            tx: single(TransactionType.Income, Currency.EGP),
            account: egpAccount,
          }),
        ),
        transferToEgp: amountRowOf(
          buildTransactionDetailPresentation(
            twoAccount(TransactionType.Transfer, Currency.EGP, Currency.EGP),
          ),
        ),
        cardPaymentToEgp: amountRowOf(
          buildTransactionDetailPresentation(
            twoAccount(TransactionType.CCPayment, Currency.EGP, Currency.EGP),
          ),
        ),
        transferToUsd: amountRowOf(
          buildTransactionDetailPresentation(
            twoAccount(TransactionType.Transfer, Currency.EGP, Currency.USD),
          ),
        ),
        cardPaymentToUsd: amountRowOf(
          buildTransactionDetailPresentation(
            twoAccount(TransactionType.CCPayment, Currency.EGP, Currency.USD),
          ),
        ),
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

      expect(amountRowOf(payment)).toBeUndefined();
      expect(factOf(payment, 'rate')?.value).toBe('1 USD = 49.00 EGP');
      expect(payment.hero).toMatchObject({ amountValue: '−735', amountCode: 'EGP' });
      expect(factOf(transfer, 'rate')?.value).toBe('1 USD = 49.00 EGP');
      expect(amountRowOf(transfer)).toEqual({ label: 'Amount in USD', value: '102.04 USD' });
    });

    it('prints a USD 0.01 expense at rate 49 as Amount in EGP 0.49 EGP, escalated past 0 dp', () => {
      expect(
        amountRowOf(
          buildTransactionDetailPresentation({
            tx: single(TransactionType.Expense, Currency.USD, { amount: 0.01, egp_amount: 0.49 }),
            account: usdAccount,
          }),
        ),
      ).toEqual({ label: 'Amount in EGP', value: '0.49 EGP' });
    });
  });
});

describe('resolveDetailActionSet (MA-181)', () => {
  const active = account({ id: 'source', name: 'CIB', currency: Currency.EGP });
  const archived = account({ id: 'source', name: 'Old HSBC', is_archived: 1 });
  const deleted = account({ id: 'source', name: '', is_archived: 1, is_deleted: 1 });
  const archivedDestination = account({ id: 'destination', name: 'Dollar Vault', is_archived: 1 });
  const liveDestination = account({ id: 'destination', name: 'Wallet' });
  const expense = transaction({
    type: TransactionType.Expense,
    to_account_id: null,
    to_amount: null,
  });
  const payment = { ...expense, commitment_payment_id: 'payment-1' };
  const byId = (...accounts: Account[]): ReadonlyMap<string, Account> =>
    new Map(accounts.map((a) => [a.id, a]));

  it.each([
    ['a plain expense', 'editDelete', expense, byId(active)],
    ["a commitment's payment", 'viewCommitment', payment, byId(active)],
    ['an expense on an archived source', 'archivedNotice', expense, byId(archived)],
    [
      'a transfer to an archived destination',
      'archivedNotice',
      transaction({}),
      byId(active, archivedDestination),
    ],
    ["a commitment's payment on an archived account", 'viewCommitment', payment, byId(archived)],
    ['an expense on a deleted source', 'editDelete', expense, byId(deleted)],
    [
      'a transfer from a deleted source',
      'editDelete',
      transaction({}),
      byId(deleted, liveDestination),
    ],
    ['an expense whose account did not resolve', 'editDelete', expense, byId()],
  ])('gives %s the %s set', (_name, expected, tx, accountsById) => {
    expect(resolveDetailActionSet(tx, accountsById)).toBe(expected);
  });
});

describe('resolveDetailActionBarCount (MA-181)', () => {
  it('holds two bars for Edit and Delete, and one for View commitment or the archived notice', () => {
    expect({
      editDelete: resolveDetailActionBarCount('editDelete'),
      viewCommitment: resolveDetailActionBarCount('viewCommitment'),
      archivedNotice: resolveDetailActionBarCount('archivedNotice'),
    }).toEqual({ editDelete: 2, viewCommitment: 1, archivedNotice: 1 });
  });
});

describe('resolveDetailAccountRow (MA-181)', () => {
  const graphiteHollow = (type: AccountType) => ({
    color: AcctTokens.graphite.rich,
    type,
    hollow: true,
  });

  it('draws an active account by its name on its own filled tile', () => {
    expect(
      resolveDetailAccountRow(
        account({ name: 'CIB', type: AccountType.Bank, color: AcctTokens.lapis.rich }),
      ),
    ).toEqual({
      name: 'CIB',
      tile: { color: AcctTokens.lapis.rich, type: AccountType.Bank, hollow: false },
      archived: false,
    });
  });

  it('frame C7: draws an archived account on the graphite hollow tile, marked archived', () => {
    expect(
      resolveDetailAccountRow(
        account({
          name: 'Old HSBC',
          type: AccountType.CreditCard,
          color: AcctTokens.lapis.rich,
          is_archived: 1,
        }),
      ),
    ).toEqual({
      name: 'Old HSBC',
      tile: graphiteHollow(AccountType.CreditCard),
      archived: true,
    });
  });

  it('draws a deleted account as Deleted Account on the graphite hollow tile, never archived', () => {
    expect(
      resolveDetailAccountRow(
        account({
          name: '',
          type: AccountType.SmartWallet,
          color: AcctTokens.lapis.rich,
          is_archived: 1,
          is_deleted: 1,
        }),
      ),
    ).toEqual({
      name: Strings.deletedAccount,
      tile: graphiteHollow(AccountType.SmartWallet),
      archived: false,
    });
  });

  it('audit L27: draws an unresolved account as Unknown account on the graphite hollow tile', () => {
    expect(resolveDetailAccountRow(undefined)).toEqual({
      name: Strings.unknownAccount,
      tile: graphiteHollow(AccountType.Bank),
      archived: false,
    });
  });

  it('draws a blank-named active account as Unnamed account on its own filled tile', () => {
    expect(
      resolveDetailAccountRow(
        account({ name: '   ', type: AccountType.Bank, color: AcctTokens.lapis.rich }),
      ),
    ).toEqual({
      name: Strings.unnamedAccount,
      tile: { color: AcctTokens.lapis.rich, type: AccountType.Bank, hollow: false },
      archived: false,
    });
  });
});

describe('buildTransactionDetailPresentation — fact rows (MA-181)', () => {
  const cib = account({ name: 'CIB', currency: Currency.EGP, color: AcctTokens.lapis.rich });
  const cibRow = {
    name: 'CIB',
    tile: { color: AcctTokens.lapis.rich, type: AccountType.Bank, hollow: false },
    archived: false,
  };
  const wallet = account({ id: 'destination', name: 'Wallet', currency: Currency.EGP });
  const visa = account({
    id: 'destination',
    name: 'Visa',
    type: AccountType.CreditCard,
    currency: Currency.EGP,
  });
  const groceries = makeTestCategory({
    id: 'groceries',
    name: 'Groceries',
    color: '#5C7FC4',
    icon: 'cart',
  });
  const salary = makeTestCategory({
    id: 'salary',
    name: 'Salary',
    type: CategoryType.Income,
    color: '#478D6E',
    icon: 'briefcase',
  });
  const refunds = makeTestCategory({
    id: 'refunds',
    name: 'Refunds',
    type: CategoryType.Income,
    color: '#478D6E',
    icon: 'cash-refund',
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
    account: cib,
    category: groceries,
  };

  it('frame C1: an expense reads its account on its tile, its glyph in the category colour, the weekday date, the time and a manual source', () => {
    const presentation = buildTransactionDetailPresentation(expenseInput);

    expect(accountRowOf(presentation)).toEqual(cibRow);
    expect(categoryRowOf(presentation)).toEqual({
      name: 'Groceries',
      glyphName: 'cart',
      glyphColor: '#5C7FC4',
    });
    expect({
      dateText: factOf(presentation, 'date')?.value,
      timeText: factOf(presentation, 'time')?.value,
      source: sourceOf(presentation),
    }).toEqual({ dateText: 'Tue 22 Sep 2026', timeText: '6:40 PM', source: 'manual' });
  });

  it('frame C2: an income reads the same rows', () => {
    const presentation = buildTransactionDetailPresentation({
      tx: egp({
        type: TransactionType.Income,
        amount: 22_300,
        egp_amount: 22_300,
        category_id: salary.id,
      }),
      account: cib,
      category: salary,
    });

    expect(accountRowOf(presentation)).toEqual(cibRow);
    expect(categoryRowOf(presentation)).toEqual({
      name: 'Salary',
      glyphName: 'briefcase',
      glyphColor: '#478D6E',
    });
    expect(sourceOf(presentation)).toBe('manual');
  });

  it.each([
    [
      'frame C3: a transfer',
      {
        tx: egp({
          amount: 5_000,
          egp_amount: 5_000,
          to_account_id: 'destination',
          to_amount: 5_000,
        }),
        account: cib,
        toAccount: wallet,
      },
    ],
    [
      'frame C4: a card payment',
      {
        tx: egp({
          type: TransactionType.CCPayment,
          amount: 5_000,
          egp_amount: 5_000,
          to_account_id: 'destination',
          to_amount: 5_000,
        }),
        account: cib,
        toAccount: visa,
      },
    ],
  ])(
    '%s has no Account and no Category row, and keeps its Date, Time and Source',
    (_name, input) => {
      const presentation = buildTransactionDetailPresentation(input);

      expect({
        accountRow: accountRowOf(presentation),
        categoryRow: categoryRowOf(presentation),
        dateText: factOf(presentation, 'date')?.value,
        timeText: factOf(presentation, 'time')?.value,
        source: sourceOf(presentation),
      }).toEqual({
        accountRow: undefined,
        categoryRow: undefined,
        dateText: 'Tue 22 Sep 2026',
        timeText: '6:40 PM',
        source: 'manual',
      });
    },
  );

  it("frame C13: card credit keeps its category's own glyph and colour on its Category row, never the refund glyph", () => {
    const card = account({ name: 'Visa', type: AccountType.CreditCard, currency: Currency.EGP });
    const presentation = buildTransactionDetailPresentation({
      tx: egp({
        type: TransactionType.Income,
        amount: 3_120,
        egp_amount: 3_120,
        category_id: refunds.id,
      }),
      account: card,
      category: refunds,
    });

    expect(categoryRowOf(presentation)).toEqual({
      name: 'Refunds',
      glyphName: 'cash-refund',
      glyphColor: '#478D6E',
    });
  });

  it('keeps Uncategorized on the fallback glyph in gold when the category does not resolve', () => {
    expect(
      categoryRowOf(
        buildTransactionDetailPresentation({
          tx: egp({ type: TransactionType.Expense, category_id: 'deleted-category' }),
          account: cib,
        }),
      ),
    ).toEqual({
      name: Strings.uncategorized,
      glyphName: 'shape-outline',
      glyphColor: GoldTokens[500],
    });
  });

  it("frame C6: a commitment's payment reads its source as the commitment", () => {
    expect(
      sourceOf(
        buildTransactionDetailPresentation({
          ...expenseInput,
          tx: { ...expenseInput.tx, commitment_payment_id: 'payment' },
        }),
      ),
    ).toBe('commitment');
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

  it('labels a single-account transaction on a deleted account', () => {
    expect(
      factOf(
        buildTransactionDetailPresentation({
          tx: transaction({
            type: TransactionType.Expense,
            to_account_id: null,
            to_amount: null,
          }),
          account: deletedSource,
        }),
        'account',
      )?.value,
    ).toBe(Strings.deletedAccount);
  });
});

describe('buildTransactionDetailPresentation — blank-named accounts (MA-062)', () => {
  it('labels a single-account transaction on a blank-named account', () => {
    expect(
      factOf(
        buildTransactionDetailPresentation({
          tx: transaction({
            type: TransactionType.Expense,
            to_account_id: null,
            to_amount: null,
          }),
          account: account({ name: '' }),
        }),
        'account',
      )?.value,
    ).toBe(Strings.unnamedAccount);
  });
});

describe('buildTransactionDetailPresentation — fact rows as data (MA-181)', () => {
  const cib = account({ name: 'CIB', currency: Currency.EGP, color: AcctTokens.lapis.rich });
  const wallet = account({ id: 'destination', name: 'Wallet', currency: Currency.USD });
  const groceries = makeTestCategory({
    id: 'groceries',
    name: 'Groceries',
    color: '#5C7FC4',
    icon: 'cart',
  });
  const archivedBadge = { label: Strings.detailAccountArchived, tone: 'neutral' };
  const capturedBadge = { label: Strings.capturedBadge, tone: 'accent' };
  const commitmentBadge = { label: Strings.typeBadgeCommitment, tone: 'accent' };

  function egp(overrides: Partial<Transaction>): Transaction {
    return transaction({
      currency: Currency.EGP,
      exchange_rate: null,
      to_account_id: null,
      to_amount: null,
      budget_id: null,
      commitment_payment_id: null,
      transaction_date: '2026-09-22',
      transaction_time: '18:40:00',
      ...overrides,
    });
  }

  const expense = egp({
    type: TransactionType.Expense,
    amount: 1_240,
    egp_amount: 1_240,
    category_id: groceries.id,
  });

  function rows(input: TransactionDetailPresentationInput) {
    return buildTransactionDetailPresentation(input).facts.map(({ label, value, badge }) => ({
      label,
      value,
      badge,
    }));
  }

  const tail = (source: { value?: string; badge?: object }) => [
    { label: 'Date', value: 'Tue 22 Sep 2026', badge: undefined },
    { label: 'Time', value: '6:40 PM', badge: undefined },
    { label: 'Source', value: source.value, badge: source.badge },
  ];

  it('frame C1: an expense reads Account, Category, Date, Time and Source, the source Manual entry with no badge', () => {
    expect(rows({ tx: expense, account: cib, category: groceries })).toEqual([
      { label: 'Account', value: 'CIB', badge: undefined },
      { label: 'Category', value: 'Groceries', badge: undefined },
      ...tail({ value: Strings.detailManualSource }),
    ]);
  });

  it('frame C3: an EGP to USD transfer reads Amount in USD over Rate with the Captured badge, and no Account or Category row', () => {
    const transfer = egp({
      type: TransactionType.Transfer,
      amount: 5_000,
      egp_amount: 5_000,
      to_account_id: wallet.id,
      to_amount: 102.04,
      exchange_rate: 49,
    });

    expect(rows({ tx: transfer, account: cib, toAccount: wallet })).toEqual([
      { label: 'Amount in USD', value: '102.04 USD', badge: undefined },
      { label: 'Rate', value: '1 USD = 49.00 EGP', badge: capturedBadge },
      ...tail({ value: Strings.detailManualSource }),
    ]);
  });

  it('frame C4: a card payment reads Date, Time and Source alone', () => {
    const payment = egp({
      type: TransactionType.CCPayment,
      amount: 5_000,
      egp_amount: 5_000,
      to_account_id: 'destination',
      to_amount: 5_000,
    });

    expect(rows({ tx: payment, account: cib })).toEqual(
      tail({ value: Strings.detailManualSource }),
    );
  });

  it("frame C6: a commitment's payment reads the Commitment badge alone on its Source row", () => {
    const payment = { ...expense, commitment_payment_id: 'payment' };

    expect(rows({ tx: payment, account: cib, category: groceries }).at(-1)).toEqual({
      label: 'Source',
      value: undefined,
      badge: commitmentBadge,
    });
  });

  it('frame C7: an archived account reads its name with the Archived badge on its Account row', () => {
    const archived = account({ name: 'Old HSBC', currency: Currency.EGP, is_archived: 1 });

    expect(rows({ tx: expense, account: archived, category: groceries })[0]).toEqual({
      label: 'Account',
      value: 'Old HSBC',
      badge: archivedBadge,
    });
  });

  it('frame C5: only the amount and Rate facts fit their value, on a USD expense with a budget and a rate', () => {
    const tx = transaction({
      type: TransactionType.Expense,
      currency: Currency.USD,
      amount: 15,
      egp_amount: 735,
      exchange_rate: 49,
      budget_id: 'budget',
      to_account_id: null,
      to_amount: null,
    });

    expect(
      Object.fromEntries(
        buildTransactionDetailPresentation({ tx, account: cib }).facts.map((fact) => [
          fact.kind,
          fact.fitsValue,
        ]),
      ),
    ).toEqual({
      account: false,
      category: false,
      budget: false,
      amount: true,
      rate: true,
      date: false,
      time: false,
      source: false,
    });
  });

  it.each([
    [TransactionType.Expense, null],
    [TransactionType.Income, null],
    [TransactionType.Transfer, 'destination'],
    [TransactionType.CCPayment, 'destination'],
  ])(
    'frame C10: the skeleton holds one slot per fact row on a USD %s with a budget and a rate',
    (type, toAccountId) => {
      const tx = transaction({
        type,
        currency: Currency.USD,
        amount: 15,
        egp_amount: 735,
        exchange_rate: 49,
        budget_id: 'budget',
        to_account_id: toAccountId,
        to_amount: toAccountId === null ? null : 15,
      });

      expect(buildDetailSkeletonGeometry(tx, 1).rowHeights).toHaveLength(
        buildTransactionDetailPresentation({ tx, account: cib }).facts.length,
      );
    },
  );
});

describe('buildTransactionDetailPresentation — flow cells (MA-196)', () => {
  const graphiteHollow = (type: AccountType) => ({
    color: AcctTokens.graphite.rich,
    type,
    hollow: true,
  });
  const cib = account({
    id: 'source',
    name: 'CIB',
    type: AccountType.Bank,
    currency: Currency.EGP,
    color: AcctTokens.lapis.rich,
  });
  const dollarVault = account({
    id: 'destination',
    name: 'Dollar Vault',
    type: AccountType.SmartWallet,
    currency: Currency.USD,
    color: AcctTokens.nile.rich,
  });
  const visa = account({
    id: 'destination',
    name: 'Visa',
    type: AccountType.CreditCard,
    currency: Currency.EGP,
    color: AcctTokens.plum.rich,
  });
  // Frame C3: 5,000 EGP left CIB and 102.04 USD arrived in Dollar Vault.
  const egpToUsd = transaction({
    type: TransactionType.Transfer,
    currency: Currency.EGP,
    amount: 5_000,
    egp_amount: 5_000,
    exchange_rate: 49,
    to_amount: 102.04,
  });
  const fromCib = {
    name: 'CIB',
    tile: { color: AcctTokens.lapis.rich, type: AccountType.Bank, hollow: false },
    amountText: { display: '−5,000 EGP', accessible: '5,000 EGP' },
    open: {
      accountId: 'source',
      accessibilityLabel: Strings.detailOpenAccountAccessibility('CIB', '5,000 EGP'),
    },
  };
  const toDollarVault = {
    name: 'Dollar Vault',
    tile: { color: AcctTokens.nile.rich, type: AccountType.SmartWallet, hollow: false },
    amountText: { display: '+102.04 USD', accessible: '102.04 USD' },
    open: {
      accountId: 'destination',
      accessibilityLabel: Strings.detailOpenAccountAccessibility('Dollar Vault', '102.04 USD'),
    },
  };

  function flowOf(input: Omit<TransactionDetailPresentationInput, 'tx'>, tx = egpToUsd) {
    return buildTransactionDetailPresentation({ tx, ...input }).transferFlow;
  }

  it('frame C3: an EGP to USD transfer draws each account on its own tile with its leg and its tap', () => {
    expect(flowOf({ account: cib, toAccount: dollarVault })).toEqual({
      from: fromCib,
      to: toDollarVault,
    });
  });

  it('frame C4: a card payment draws the bank and the card on their own tiles with both legs', () => {
    const payment = transaction({
      type: TransactionType.CCPayment,
      currency: Currency.EGP,
      amount: 3_000,
      egp_amount: 3_000,
      exchange_rate: null,
      to_amount: null,
    });

    expect(flowOf({ account: cib, toAccount: visa }, payment)).toEqual({
      from: {
        ...fromCib,
        amountText: { display: '−3,000 EGP', accessible: '3,000 EGP' },
        open: {
          accountId: 'source',
          accessibilityLabel: Strings.detailOpenAccountAccessibility('CIB', '3,000 EGP'),
        },
      },
      to: {
        name: 'Visa',
        tile: { color: AcctTokens.plum.rich, type: AccountType.CreditCard, hollow: false },
        amountText: { display: '+3,000 EGP', accessible: '3,000 EGP' },
        open: {
          accountId: 'destination',
          accessibilityLabel: Strings.detailOpenAccountAccessibility('Visa', '3,000 EGP'),
        },
      },
    });
  });

  it('frame C7: an archived From side keeps its name, amount and tap on the graphite hollow tile', () => {
    const flow = flowOf({ account: { ...cib, is_archived: 1 }, toAccount: dollarVault });

    expect(flow).toEqual({
      from: { ...fromCib, tile: graphiteHollow(AccountType.Bank) },
      to: toDollarVault,
    });
  });

  it('frame C7: an archived To side keeps its name, amount and tap on the graphite hollow tile', () => {
    const flow = flowOf({ account: cib, toAccount: { ...dollarVault, is_archived: 1 } });

    expect(flow).toEqual({
      from: fromCib,
      to: { ...toDollarVault, tile: graphiteHollow(AccountType.SmartWallet) },
    });
  });

  it('a deleted From account reads Deleted Account on the graphite hollow tile, keeps its amount and takes no tap', () => {
    const flow = flowOf({
      account: { ...cib, name: '', is_archived: 1, is_deleted: 1 },
      toAccount: dollarVault,
    });

    expect(flow?.from).toEqual({
      name: Strings.deletedAccount,
      tile: graphiteHollow(AccountType.Bank),
      amountText: fromCib.amountText,
    });
    expect(flow?.from.open).toBeUndefined();
    expect(flow?.to).toEqual(toDollarVault);
  });

  it('a deleted To account reads Deleted Account on the graphite hollow tile, keeps its amount and takes no tap', () => {
    const flow = flowOf({
      account: cib,
      toAccount: { ...dollarVault, name: '', is_archived: 1, is_deleted: 1 },
    });

    expect(flow?.from).toEqual(fromCib);
    expect(flow?.to).toEqual({
      name: Strings.deletedAccount,
      tile: graphiteHollow(AccountType.SmartWallet),
      amountText: toDollarVault.amountText,
    });
    expect(flow?.to.open).toBeUndefined();
  });

  it('audit L27: an unresolved From account reads Unknown account on the graphite hollow tile, still printing the amount, with no tap', () => {
    const flow = flowOf({ account: undefined, toAccount: dollarVault });

    expect(flow?.from).toEqual({
      name: Strings.unknownAccount,
      tile: graphiteHollow(AccountType.Bank),
      amountText: fromCib.amountText,
    });
    expect(flow?.from.open).toBeUndefined();
    expect(flow?.to).toEqual(toDollarVault);
  });

  it('audit L27: an unresolved To account reads Unknown account on the graphite hollow tile, with no amount and no tap', () => {
    const flow = flowOf({ account: cib, toAccount: undefined });

    expect(flow?.from).toEqual(fromCib);
    expect(flow?.to).toEqual({
      name: Strings.unknownAccount,
      tile: graphiteHollow(AccountType.Bank),
    });
    expect(flow?.to.amountText).toBeUndefined();
    expect(flow?.to.open).toBeUndefined();
  });

  it('holds a flow exactly when the type takes a destination, whether or not its accounts resolved', () => {
    const flowFor = (type: TransactionType, toAccountId: string | null) =>
      buildTransactionDetailPresentation({
        tx: transaction({
          type,
          to_account_id: toAccountId,
          to_amount: toAccountId === null ? null : 4_850,
        }),
      }).transferFlow;

    expect({
      expense: flowFor(TransactionType.Expense, null),
      income: flowFor(TransactionType.Income, null),
      transfer: flowFor(TransactionType.Transfer, 'destination') !== null,
      ccPayment: flowFor(TransactionType.CCPayment, 'destination') !== null,
    }).toEqual({ expense: null, income: null, transfer: true, ccPayment: true });
  });
});

describe('resolveTransferFlowView (MA-196)', () => {
  const flow: TransferFlow = {
    from: {
      name: 'CIB',
      tile: { color: AcctTokens.lapis.rich, type: AccountType.Bank, hollow: false },
    },
    to: {
      name: Strings.unknownAccount,
      tile: { color: AcctTokens.graphite.rich, type: AccountType.Bank, hollow: true },
    },
  };

  it('is none without a flow, whatever the lookup', () => {
    expect([
      resolveTransferFlowView(null, true, false),
      resolveTransferFlowView(null, false, true),
    ]).toEqual([{ kind: 'none' }, { kind: 'none' }]);
  });

  it('is pending while a side is unresolved and the lookup has not settled', () => {
    expect(resolveTransferFlowView(flow, true, false)).toEqual({ kind: 'pending' });
  });

  it('draws the cells once the lookup settled, or when every side resolved', () => {
    expect([
      resolveTransferFlowView(flow, true, true),
      resolveTransferFlowView(flow, false, false),
    ]).toEqual([
      { kind: 'cells', flow },
      { kind: 'cells', flow },
    ]);
  });
});
