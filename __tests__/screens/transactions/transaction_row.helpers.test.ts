import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { lineHeightFor } from '@/constants/theme';
import {
  AccentCCTokens,
  AccentTokens,
  AcctTokens,
  GoldTokens,
  InfoTokens,
} from '@/constants/theme_tokens';
import {
  buildTransactionRowPresentation,
  resolveRowTile,
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_LINE_GAP,
  TRANSACTION_ROW_TITLE_BADGE_HEIGHT,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
} from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { makeTestAccount, makeTestCategory, makeTestTransaction } from '@/test_helpers/transaction';

const cib = makeTestAccount({
  id: 'cib',
  name: 'CIB Current',
  type: AccountType.Bank,
  color: AcctTokens.lapis.rich,
});
const payoneer = makeTestAccount({
  id: 'payoneer',
  name: 'Payoneer',
  type: AccountType.SmartWallet,
  currency: Currency.USD,
  color: AcctTokens.nile.rich,
});
const visa = makeTestAccount({
  id: 'visa',
  name: 'Visa',
  type: AccountType.CreditCard,
  color: AcctTokens.plum.rich,
});
const groceries = makeTestCategory({
  id: 'groceries',
  name: 'Groceries',
  icon: 'cart',
  color: AccentTokens.spice,
});
const salary = makeTestCategory({
  id: 'salary',
  name: 'Salary',
  type: CategoryType.Income,
  icon: 'cash',
  color: AccentTokens.nile,
});

const cibTile = { color: AcctTokens.lapis.rich, type: AccountType.Bank, hollow: false };
const payoneerTile = { color: AcctTokens.nile.rich, type: AccountType.SmartWallet, hollow: false };
const visaTile = { color: AcctTokens.plum.rich, type: AccountType.CreditCard, hollow: false };

describe('buildTransactionRowPresentation, one case per type', () => {
  it('draws an expense with the category glyph, note · time and a minus-signed amount over EGP', () => {
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({
        amount: 1_240,
        egp_amount: 1_240,
        account_id: cib.id,
        category_id: groceries.id,
        note: 'Carrefour',
        transaction_time: '18:40:00',
      }),
      account: cib,
      category: groceries,
    });

    expect(row).toMatchObject({
      title: 'Groceries',
      caption: 'Carrefour · 6:40 PM',
      captionLead: 'Carrefour',
      captionTime: '6:40 PM',
      primaryAmount: '−1,240',
      secondaryLine: 'EGP',
      glyphName: 'cart',
      glyphColor: AccentTokens.spice,
      amountClassName: 'text-danger',
    });
    expect(row.tiles).toEqual([cibTile]);
  });

  it('draws an income with a plus-signed amount in the positive colour', () => {
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({
        type: TransactionType.Income,
        amount: 22_300,
        egp_amount: 22_300,
        account_id: cib.id,
        category_id: salary.id,
        transaction_time: '09:15:00',
      }),
      account: cib,
      category: salary,
    });

    expect(row).toMatchObject({
      title: 'Salary',
      caption: '9:15 AM',
      captionTime: '9:15 AM',
      primaryAmount: '+22,300',
      secondaryLine: 'EGP',
      glyphName: 'cash',
      glyphColor: AccentTokens.nile,
      amountClassName: 'text-success',
    });
    expect(row.tiles).toEqual([cibTile]);
  });

  it('draws a transfer with both tiles, from → to · time and an unsigned amount over the destination amount', () => {
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({
        type: TransactionType.Transfer,
        amount: 5_000,
        egp_amount: 5_000,
        exchange_rate: 49,
        to_amount: 102.04,
        account_id: cib.id,
        to_account_id: payoneer.id,
        category_id: null,
        transaction_time: '10:30:00',
      }),
      account: cib,
      toAccount: payoneer,
    });

    expect(row).toMatchObject({
      title: Strings.transferTitle,
      caption: 'CIB Current → Payoneer · 10:30 AM',
      primaryAmount: '5,000',
      secondaryLine: '→ 102.04 USD',
      glyphName: 'swap-horizontal',
      glyphColor: InfoTokens[500],
      amountClassName: 'text-info',
    });
    expect(row.tiles).toEqual([cibTile, payoneerTile]);
  });

  it('draws a card payment with both tiles and an unsigned amount in the card accent', () => {
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({
        type: TransactionType.CCPayment,
        amount: 3_000,
        egp_amount: 3_000,
        account_id: cib.id,
        to_account_id: visa.id,
        category_id: null,
        transaction_time: '20:05:00',
      }),
      account: cib,
      toAccount: visa,
    });

    expect(row).toMatchObject({
      title: Strings.addTxTypeCCPayment,
      caption: 'CIB Current → Visa · 8:05 PM',
      primaryAmount: '3,000',
      secondaryLine: 'EGP',
      glyphName: 'credit-card-refund',
      glyphColor: AccentCCTokens[500],
      amountClassName: 'text-accent-cc',
    });
    expect(row.tiles).toEqual([cibTile, visaTile]);
  });

  it('draws a card credit on the card tile with the refund glyph and a plus-signed amount in info blue', () => {
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({
        type: TransactionType.Income,
        amount: 450,
        egp_amount: 450,
        account_id: visa.id,
        category_id: salary.id,
        note: 'Refund',
        transaction_time: '13:00:00',
      }),
      account: visa,
      category: salary,
    });

    expect(row).toMatchObject({
      title: Strings.cardCreditTitle,
      caption: 'Refund · 1:00 PM',
      primaryAmount: '+450',
      secondaryLine: 'EGP',
      glyphName: 'credit-card-refund',
      glyphColor: InfoTokens[500],
      amountClassName: 'text-info',
    });
    expect(row.tiles).toEqual([visaTile]);
  });

  it('gives an uncategorised expense the fallback glyph in gold', () => {
    expect(
      buildTransactionRowPresentation({
        tx: makeTestTransaction({ account_id: cib.id, category_id: null }),
        account: cib,
      }),
    ).toMatchObject({
      title: Strings.uncategorized,
      glyphName: 'shape-outline',
      glyphColor: GoldTokens[500],
    });
  });
});

describe('buildTransactionRowPresentation, amounts and captions', () => {
  it('shows a USD expense over its EGP amount and rate, the note caption unchanged', () => {
    expect(
      buildTransactionRowPresentation({
        tx: makeTestTransaction({
          amount: 15,
          currency: Currency.USD,
          egp_amount: 735,
          exchange_rate: 49,
          account_id: payoneer.id,
          category_id: groceries.id,
          note: 'Figma',
          transaction_time: '11:20:00',
        }),
        account: payoneer,
        category: groceries,
      }),
    ).toMatchObject({
      caption: 'Figma · 11:20 AM',
      primaryAmount: '−15.00',
      secondaryLine: '≈ 735 EGP @ 49.00',
      accessibilityLabel: 'Groceries, Payoneer, Figma · 11:20 AM, −15.00 USD, ≈ 735 EGP @ 49.00',
    });
  });

  it('leaves a sub-unit USD expense unescalated, its 2dp precision already carrying the magnitude', () => {
    expect(
      buildTransactionRowPresentation({
        tx: makeTestTransaction({
          amount: 0.4,
          currency: Currency.USD,
          egp_amount: 20,
          exchange_rate: 50,
          account_id: payoneer.id,
        }),
        account: payoneer,
        category: groceries,
      }),
    ).toMatchObject({
      primaryAmount: '−0.40',
      secondaryLine: '≈ 20 EGP @ 50.00',
    });
  });

  it('falls back to the currency code on a transfer with no destination amount', () => {
    const usdSavings = makeTestAccount({
      id: 'usd-2',
      name: 'USD Savings',
      currency: Currency.USD,
    });

    expect(
      buildTransactionRowPresentation({
        tx: makeTestTransaction({
          type: TransactionType.Transfer,
          amount: 100,
          currency: Currency.USD,
          egp_amount: 4_900,
          exchange_rate: 49,
          to_amount: null,
          account_id: payoneer.id,
          to_account_id: usdSavings.id,
          category_id: null,
        }),
        account: payoneer,
        toAccount: usdSavings,
      }),
    ).toMatchObject({
      primaryAmount: '100.00',
      secondaryLine: 'USD',
    });
  });

  it('trims the note, and a blank note leaves the time alone', () => {
    const input = { account: cib, category: groceries };

    expect(
      buildTransactionRowPresentation({
        ...input,
        tx: makeTestTransaction({
          amount: 1_250_000,
          egp_amount: 1_250_000,
          note: '  Annual rent  ',
        }),
      }),
    ).toMatchObject({ caption: 'Annual rent · 12:00 PM', primaryAmount: '−1,250,000' });
    expect(
      buildTransactionRowPresentation({ ...input, tx: makeTestTransaction({ note: '   ' }) })
        .caption,
    ).toBe('12:00 PM');
  });
});

describe('buildTransactionRowPresentation, the spoken account', () => {
  it('speaks the account name on an expense, whose tile has no label', () => {
    expect(
      buildTransactionRowPresentation({
        tx: makeTestTransaction({
          amount: 1_240,
          egp_amount: 1_240,
          account_id: cib.id,
          note: 'Carrefour',
          transaction_time: '18:40:00',
        }),
        account: cib,
        category: groceries,
      }).accessibilityLabel,
    ).toBe('Groceries, CIB Current, Carrefour · 6:40 PM, −1,240 EGP');
  });

  it('speaks both account names on a transfer', () => {
    expect(
      buildTransactionRowPresentation({
        tx: makeTestTransaction({
          type: TransactionType.Transfer,
          account_id: cib.id,
          to_account_id: payoneer.id,
          category_id: null,
        }),
        account: cib,
        toAccount: payoneer,
      }).accessibilityLabel,
    ).toBe('Transfer, CIB Current → Payoneer · 12:00 PM, 100 EGP');
  });

  it('draws an archived account filled in its colour and speaks its name', () => {
    const archived = makeTestAccount({
      id: 'old',
      name: 'Old Savings',
      type: AccountType.PhysicalSavings,
      color: AcctTokens.jade.rich,
      is_archived: 1,
    });
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({ account_id: archived.id }),
      account: archived,
      category: groceries,
    });

    expect(row.tiles).toEqual([
      { color: AcctTokens.jade.rich, type: AccountType.PhysicalSavings, hollow: false },
    ]);
    expect(row.accessibilityLabel.split(', ')[1]).toBe('Old Savings');
  });
});

describe('buildTransactionRowPresentation, the caption override', () => {
  const expenseInput = {
    tx: makeTestTransaction({ account_id: cib.id, note: 'Carrefour' }),
    account: cib,
    category: groceries,
  };
  const transferInput = {
    tx: makeTestTransaction({
      type: TransactionType.Transfer,
      account_id: cib.id,
      to_account_id: payoneer.id,
      category_id: null,
    }),
    account: cib,
    toAccount: payoneer,
  };

  it('replaces the lead and the time, and nothing else', () => {
    const shipped = buildTransactionRowPresentation(expenseInput);
    const overridden = buildTransactionRowPresentation(expenseInput, {
      lead: 'From CIB Current',
      time: '18 Sep',
    });

    expect(overridden.caption).toBe('From CIB Current · 18 Sep');
    expect(overridden.accessibilityLabel).toBe(
      shipped.accessibilityLabel.replace(shipped.caption, overridden.caption),
    );
    expect(overridden).toMatchObject({ captionLead: 'From CIB Current', captionTime: '18 Sep' });
    expect({
      ...overridden,
      caption: shipped.caption,
      captionLead: shipped.captionLead,
      captionTime: shipped.captionTime,
      accessibilityLabel: shipped.accessibilityLabel,
    }).toEqual(shipped);
  });

  it('keeps the note or the from → to lead when only the time is overridden', () => {
    expect(buildTransactionRowPresentation(expenseInput, { time: 'Yesterday' }).caption).toBe(
      'Carrefour · Yesterday',
    );
    expect(buildTransactionRowPresentation(transferInput, { time: 'Yesterday' }).caption).toBe(
      'CIB Current → Payoneer · Yesterday',
    );
  });

  it('reads the overridden time alone when the row has no note and no lead', () => {
    expect(
      buildTransactionRowPresentation(
        { ...expenseInput, tx: makeTestTransaction({ account_id: cib.id, note: null }) },
        { time: 'Yesterday' },
      ).caption,
    ).toBe('Yesterday');
  });
});

describe('buildTransactionRowPresentation, ownership', () => {
  it('labels a budget-assigned row and speaks the label last', () => {
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({ account_id: cib.id, budget_id: 'budget-1' }),
      account: cib,
      category: groceries,
    });

    expect(row).toMatchObject({
      ownershipLabel: Strings.transactionBudgetAssigned,
      isCommitmentOwned: false,
    });
    expect(row.accessibilityLabel).toBe(
      `Groceries, CIB Current, 12:00 PM, −100 EGP, ${Strings.transactionBudgetAssigned}`,
    );
  });

  it('gives commitment ownership precedence over a named budget', () => {
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({
        account_id: cib.id,
        commitment_payment_id: 'payment-1',
        budget_id: 'budget-1',
      }),
      account: cib,
      category: groceries,
    });

    expect(row).toMatchObject({
      ownershipLabel: Strings.typeBadgeCommitment,
      isCommitmentOwned: true,
    });
    expect(row.accessibilityLabel).toBe(
      `Groceries, CIB Current, 12:00 PM, −100 EGP, ${Strings.typeBadgeCommitment}`,
    );
  });
});

describe('buildTransactionRowPresentation, the destination line and the spoken pair', () => {
  it('reads the code for a same-currency card payment and for an unresolved destination', () => {
    const payment = makeTestTransaction({
      type: TransactionType.CCPayment,
      amount: 3_000,
      egp_amount: 3_000,
      to_amount: 3_000,
      account_id: cib.id,
      to_account_id: visa.id,
      category_id: null,
    });

    expect(
      buildTransactionRowPresentation({ tx: payment, account: cib, toAccount: visa }).secondaryLine,
    ).toBe('EGP');
    expect(buildTransactionRowPresentation({ tx: payment, account: cib }).secondaryLine).toBe(
      'EGP',
    );
  });

  it('speaks the pair again when a caller replaces the lead', () => {
    const payment = makeTestTransaction({
      type: TransactionType.CCPayment,
      account_id: cib.id,
      to_account_id: visa.id,
      category_id: null,
    });

    expect(
      buildTransactionRowPresentation(
        { tx: payment, account: cib, toAccount: visa },
        { lead: 'From CIB Current', time: '18 Sep' },
      ).accessibilityLabel,
    ).toBe(`${Strings.addTxTypeCCPayment}, CIB Current → Visa, From CIB Current · 18 Sep, 100 EGP`);
  });
});

describe('resolveRowTile', () => {
  it('draws a live account filled in its colour with its type', () => {
    expect(resolveRowTile(visa)).toEqual(visaTile);
  });

  it('draws an unresolved account as the hollow graphite tile', () => {
    expect(resolveRowTile(undefined)).toEqual({
      color: AcctTokens.graphite.rich,
      type: AccountType.Bank,
      hollow: true,
    });
  });
});

describe('buildTransactionRowPresentation, deleted accounts (MA-020)', () => {
  const deletedSource = makeTestAccount({
    id: 'gone',
    name: '',
    type: AccountType.Bank,
    color: AcctTokens.lapis.rich,
    is_archived: 1,
    is_deleted: 1,
  });
  const deletedTarget = makeTestAccount({
    id: 'gone-too',
    name: '',
    type: AccountType.SmartWallet,
    color: AcctTokens.nile.rich,
    is_archived: 1,
    is_deleted: 1,
  });
  const hollowBank = { color: AcctTokens.graphite.rich, type: AccountType.Bank, hollow: true };
  const hollowWallet = {
    color: AcctTokens.graphite.rich,
    type: AccountType.SmartWallet,
    hollow: true,
  };

  it('draws a deleted expense account hollow graphite and speaks "Deleted Account"', () => {
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({ account_id: deletedSource.id }),
      account: deletedSource,
      category: groceries,
    });

    expect(row.tiles).toEqual([hollowBank]);
    expect(row.accessibilityLabel.split(', ')[1]).toBe(Strings.deletedAccount);
  });

  it('draws the deleted side of a transfer hollow and names it in the caption', () => {
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({
        type: TransactionType.Transfer,
        account_id: cib.id,
        to_account_id: deletedTarget.id,
        category_id: null,
      }),
      account: cib,
      toAccount: deletedTarget,
    });

    expect(row.tiles).toEqual([cibTile, hollowWallet]);
    expect(row.caption).toBe(`CIB Current → ${Strings.deletedAccount} · 12:00 PM`);
  });

  it('reads "Deleted Account" on both sides of a transfer between two deleted accounts', () => {
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({
        type: TransactionType.Transfer,
        account_id: deletedSource.id,
        to_account_id: deletedTarget.id,
        category_id: null,
      }),
      account: deletedSource,
      toAccount: deletedTarget,
    });

    expect(row.tiles).toEqual([hollowBank, hollowWallet]);
    expect(row.caption).toBe(`${Strings.deletedAccount} → ${Strings.deletedAccount} · 12:00 PM`);
  });

  it('keeps the card-credit branch on a deleted card, its tile hollow', () => {
    const deletedCard = makeTestAccount({
      id: 'gone-card',
      name: '',
      type: AccountType.CreditCard,
      color: AcctTokens.plum.rich,
      is_archived: 1,
      is_deleted: 1,
    });
    const row = buildTransactionRowPresentation({
      tx: makeTestTransaction({ type: TransactionType.Income, account_id: deletedCard.id }),
      account: deletedCard,
      category: groceries,
    });

    expect(row.title).toBe(Strings.cardCreditTitle);
    expect(row.tiles).toEqual([
      { color: AcctTokens.graphite.rich, type: AccountType.CreditCard, hollow: true },
    ]);
    expect(row.accessibilityLabel.split(', ')[1]).toBe(Strings.deletedAccount);
  });
});

describe('buildTransactionRowPresentation, blank-named accounts (MA-062)', () => {
  const blankSource = makeTestAccount({ id: 'blank', name: '' });
  const blankTarget = makeTestAccount({ id: 'blank-too', name: '' });

  it('speaks "Unnamed account" on an expense', () => {
    expect(
      buildTransactionRowPresentation({
        tx: makeTestTransaction({ account_id: blankSource.id }),
        account: blankSource,
        category: groceries,
      }).accessibilityLabel,
    ).toBe(`Groceries, ${Strings.unnamedAccount}, 12:00 PM, −100 EGP`);
  });

  it('reads "Unnamed account" on both sides of a transfer caption', () => {
    expect(
      buildTransactionRowPresentation({
        tx: makeTestTransaction({
          type: TransactionType.Transfer,
          account_id: blankSource.id,
          to_account_id: blankTarget.id,
          category_id: null,
        }),
        account: blankSource,
        toAccount: blankTarget,
      }).caption,
    ).toBe(`${Strings.unnamedAccount} → ${Strings.unnamedAccount} · 12:00 PM`);
  });
});

describe('transaction row line geometry', () => {
  // The row's own `border-b` comes out of its content box.
  const innerBox = TRANSACTION_ROW_HEIGHT - 1;

  it('fits the title row, the gap and the caption inside the row', () => {
    const contentColumn =
      Math.max(lineHeightFor(TRANSACTION_ROW_TITLE_FONT_SIZE), TRANSACTION_ROW_TITLE_BADGE_HEIGHT) +
      TRANSACTION_ROW_LINE_GAP +
      lineHeightFor(TRANSACTION_ROW_CAPTION_FONT_SIZE);

    expect(contentColumn).toBeLessThanOrEqual(innerBox);
  });

  it('fits the amount, the gap and the code line inside the row', () => {
    const valueColumn =
      lineHeightFor(TRANSACTION_ROW_AMOUNT_FONT_SIZE) +
      TRANSACTION_ROW_LINE_GAP +
      lineHeightFor(TRANSACTION_ROW_CODE_FONT_SIZE);

    expect(valueColumn).toBeLessThanOrEqual(innerBox);
  });
});
