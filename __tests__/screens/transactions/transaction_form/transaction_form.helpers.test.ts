import { AccountType, CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AcctTokens } from '@/constants/theme_tokens';
import { isRateStale } from '@/modules/currency/store/currency.helpers';
import {
  resolveTransactionAmounts,
  TransactionAmountError,
} from '@/modules/transactions/domain/transaction_amounts';
import {
  TransactionAccountArchivedError,
  TransactionValidationError,
} from '@/modules/transactions/repositories/transaction.errors';
import { formatStoredRateLine } from '@/modules/transactions/screens/transactions/transaction_form/components/stored_rate_line.helpers';
import {
  applyRateCommit,
  countTransactionFormFieldErrors,
  formatConvertedAmount,
  formatRateRowValue,
  resolveAccountPreselect,
  resolveAccountStripChips,
  resolveBudgetFieldError,
  resolveConvertedAmount,
  resolveDestinationFloorError,
  resolveEligibleFromAccounts,
  resolveEligibleToAccounts,
  resolveLockedStripChips,
  resolveRateCommit,
  resolveRateEditorSource,
  resolveStripSelectedId,
  resolveToRowFace,
  resolveTransactionDeleteError,
  resolveTransactionFormFooterVisible,
  resolveTransactionFormSemantics,
  resolveTransactionFormStatus,
  resolveTransactionSaveError,
  toTransactionTimestamp,
  type TransactionFormFieldErrors,
} from '@/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers';
import { makeTestAccount } from '@/test_helpers/transaction';
import { parsePositiveDecimal } from '@/utils/parse_decimal';

describe('transaction form helpers', () => {
  it.each([
    ['50abc', undefined],
    ['0', undefined],
    ['-1', undefined],
    ['', undefined],
    ['12,34', undefined],
    ['50.25', 50.25],
    ['5,000.25', 5000.25],
  ])('strictly parses %s', (input, expected) => {
    expect(parsePositiveDecimal(input)).toBe(expected);
  });

  it('derives Card credit semantics from Income on a credit card', () => {
    expect(resolveTransactionFormSemantics(TransactionType.Income, AccountType.CreditCard)).toEqual(
      {
        isCardCredit: true,
        categoryType: CategoryType.Expense,
        usesBudget: true,
        typeLabel: Strings.addTxTypeCardCredit,
        supportingText: Strings.addTxSupportCardCredit,
      },
    );
  });

  it('keeps cash income on income categories without budget assignment', () => {
    expect(resolveTransactionFormSemantics(TransactionType.Income, AccountType.Bank)).toEqual({
      isCardCredit: false,
      categoryType: CategoryType.Income,
      usesBudget: false,
      typeLabel: Strings.addTxTypeIncome,
      supportingText: Strings.addTxSupportIncome,
    });
  });

  it('captures local date and time from the same submit clock', () => {
    const now = new Date(2026, 6, 1, 0, 30, 45);
    expect(toTransactionTimestamp(now)).toEqual({
      date: '2026-07-01',
      time: '00:30:45',
    });
  });

  it('maps balance policy issues to actionable form copy', () => {
    expect(
      resolveTransactionSaveError({ issues: [{ code: 'card_credit_exceeds_liability' }] }),
    ).toBe(Strings.addTxErrCardCreditExceedsLiability);
    expect(resolveTransactionSaveError(new Error('write failed'))).toBe(
      Strings.transactionSaveError,
    );
  });

  it('maps the discriminated output-guard cause to the named constant, ignoring its own message', () => {
    expect(
      resolveTransactionSaveError(
        new TransactionAmountError('arbitrary internal text', 'unstorable'),
      ),
    ).toBe(Strings.addTxErrAmountUnstorable);
  });

  // #363: whatever still reaches save after `resolveDestinationFloorError` already validated —
  // e.g. state changed between validation and submit — gets its own copy, not the retry banner.
  it('maps the discriminated zero-destination cause to its own copy, ignoring its own message', () => {
    expect(
      resolveTransactionSaveError(
        new TransactionAmountError('arbitrary internal text', 'zero-destination'),
      ),
    ).toBe(Strings.addTxErrDestinationTooSmall);
  });

  it('falls through an undiscriminated TransactionAmountError to the generic banner', () => {
    expect(
      resolveTransactionSaveError(
        new TransactionAmountError('A positive USD exchange rate is required'),
      ),
    ).toBe(Strings.transactionSaveError);
  });

  it('MA-053: maps an archived-account refusal to the line naming the account', () => {
    const refusal = new TransactionAccountArchivedError(
      'source',
      makeTestAccount({ name: 'Old Card' }),
    );

    expect(resolveTransactionSaveError(refusal)).toBe(
      Strings.transactionAccountArchived('Old Card'),
    );
    expect(resolveTransactionSaveError(new TransactionValidationError('invalid'))).toBe(
      Strings.transactionSaveError,
    );
  });

  it('MA-053: maps a delete refusal to the same line and anything else to the delete copy', () => {
    const refusal = new TransactionAccountArchivedError(
      'destination',
      makeTestAccount({ name: 'Old Card' }),
    );

    expect(resolveTransactionDeleteError(refusal)).toBe(
      Strings.transactionAccountArchived('Old Card'),
    );
    expect(resolveTransactionDeleteError(new Error('x'))).toBe(Strings.errDeleteFailed);
  });

  it('MA-073: a blank-named archived account reads "Unnamed account" on save and delete', () => {
    const refusal = new TransactionAccountArchivedError(
      'source',
      makeTestAccount({ name: '  ', is_archived: 1 }),
    );
    const line = Strings.transactionAccountArchived(Strings.unnamedAccount);

    expect(resolveTransactionSaveError(refusal)).toBe(line);
    expect(resolveTransactionDeleteError(refusal)).toBe(line);
  });

  it('MA-073: a deleted archived account reads "Deleted Account" on save and delete', () => {
    const refusal = new TransactionAccountArchivedError(
      'source',
      makeTestAccount({ name: '', is_archived: 1, is_deleted: 1 }),
    );
    const line = Strings.transactionAccountArchived(Strings.deletedAccount);

    expect(resolveTransactionSaveError(refusal)).toBe(line);
    expect(resolveTransactionDeleteError(refusal)).toBe(line);
  });
});

describe('resolveDestinationFloorError', () => {
  const floor = (input: {
    type: TransactionType;
    amount: number;
    sourceCurrency: Currency | undefined;
    destinationCurrency: Currency | undefined;
    exchangeRateText: string;
  }) => resolveDestinationFloorError(input);

  it('refuses the divide branch when the leg rounds to zero: 0.2 EGP / 50 → 0.00 USD', () => {
    expect(
      floor({
        type: TransactionType.Transfer,
        amount: 0.2,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      }),
    ).toBe(Strings.addTxErrConvertedBelowMin(Currency.USD));
  });

  it('refuses the exact half-even tie: 0.25 EGP / 50 rounds down to 0.00 USD', () => {
    expect(
      floor({
        type: TransactionType.CCPayment,
        amount: 0.25,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      }),
    ).toBe(Strings.addTxErrConvertedBelowMin(Currency.USD));
  });

  it('passes one cent above the tie: 0.26 EGP / 50 → 0.01 USD', () => {
    expect(
      floor({
        type: TransactionType.Transfer,
        amount: 0.26,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      }),
    ).toBeUndefined();
  });

  it('refuses the multiply branch too: 0.01 USD × 0.4 → 0.00 EGP', () => {
    expect(
      floor({
        type: TransactionType.Transfer,
        amount: 0.01,
        sourceCurrency: Currency.USD,
        destinationCurrency: Currency.EGP,
        exchangeRateText: '0.4',
      }),
    ).toBe(Strings.addTxErrConvertedBelowMin(Currency.EGP));
  });

  it('USD → USD passes at the floor: the leg is the amount itself', () => {
    expect(
      floor({
        type: TransactionType.Transfer,
        amount: 0.01,
        sourceCurrency: Currency.USD,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      }),
    ).toBeUndefined();
  });

  it('EGP → EGP passes at the floor with no rate at all', () => {
    expect(
      floor({
        type: TransactionType.Transfer,
        amount: 0.01,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.EGP,
        exchangeRateText: '',
      }),
    ).toBeUndefined();
  });

  it('stays silent for types without a destination leg', () => {
    expect(
      floor({
        type: TransactionType.Expense,
        amount: 0.2,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      }),
    ).toBeUndefined();
  });

  it('stays silent while the destination, rate, or entered amount carry their own field errors', () => {
    const base = {
      type: TransactionType.Transfer,
      amount: 0.2,
      sourceCurrency: Currency.EGP,
      destinationCurrency: Currency.USD,
      exchangeRateText: '50',
    };
    expect(floor({ ...base, destinationCurrency: undefined })).toBeUndefined();
    expect(floor({ ...base, exchangeRateText: '' })).toBeUndefined();
    expect(floor({ ...base, exchangeRateText: '0' })).toBeUndefined();
    expect(floor({ ...base, amount: 0.005 })).toBeUndefined();
    expect(floor({ ...base, amount: Number.NaN })).toBeUndefined();
  });
});

describe('MA-105 footer status line', () => {
  const lookupFailed = 'Could not load budgets';

  it('counts one field at fault', () => {
    const errors: TransactionFormFieldErrors = { amount: 'Enter an amount' };

    expect(countTransactionFormFieldErrors(errors)).toBe(1);
    expect(resolveTransactionFormStatus({ errors })).toBe('Fix the 1 field marked above.');
  });

  it('counts two fields at fault', () => {
    const errors: TransactionFormFieldErrors = {
      amount: 'Enter an amount',
      category: 'Pick a category',
    };

    expect(countTransactionFormFieldErrors(errors)).toBe(2);
    expect(resolveTransactionFormStatus({ errors })).toBe('Fix the 2 fields marked above.');
  });

  it('counts only the keys whose message is set', () => {
    const errors: TransactionFormFieldErrors = {
      amount: undefined,
      account: undefined,
      toAccount: undefined,
      category: 'Pick a category',
      budget: undefined,
    };

    expect(countTransactionFormFieldErrors(errors)).toBe(1);
  });

  it('counts the budget field without a lookup failure and not with one', () => {
    expect(countTransactionFormFieldErrors({ budget: 'Pick a budget' })).toBe(1);
    expect(
      countTransactionFormFieldErrors(
        { budget: lookupFailed, amount: 'Enter an amount' },
        lookupFailed,
      ),
    ).toBe(1);
    expect(
      resolveTransactionFormStatus({
        errors: { budget: lookupFailed },
        budgetLookupError: lookupFailed,
      }),
    ).toBeUndefined();
  });

  it('counts every key the errors type carries, and no budget fault behind a lookup failure', () => {
    const errors: Required<TransactionFormFieldErrors> = {
      amount: 'Enter an amount',
      account: 'Pick an account',
      toAccount: 'Pick where the money goes',
      category: 'Pick a category',
      budget: 'Pick a budget',
    };

    expect(countTransactionFormFieldErrors(errors)).toBe(5);
    expect(countTransactionFormFieldErrors({ budget: lookupFailed }, lookupFailed)).toBe(0);
  });

  it('reads a budget error as a field fault only without a lookup failure', () => {
    expect(resolveBudgetFieldError('Pick a budget', lookupFailed)).toBeUndefined();
    expect(resolveBudgetFieldError('Pick a budget', undefined)).toBe('Pick a budget');
  });

  it('returns the save error when no field is at fault', () => {
    expect(
      resolveTransactionFormStatus({ errors: {}, saveError: Strings.transactionSaveError }),
    ).toBe(Strings.transactionSaveError);
  });

  it('puts the count line over a save error', () => {
    expect(
      resolveTransactionFormStatus({
        errors: { amount: 'Enter an amount' },
        saveError: Strings.transactionSaveError,
      }),
    ).toBe('Fix the 1 field marked above.');
  });

  it('is empty with no field at fault and no save error', () => {
    expect(resolveTransactionFormStatus({ errors: {} })).toBeUndefined();
  });

  it.each([
    [
      'a plain Error',
      new Error('write failed'),
      "Couldn't save this transaction. Nothing was changed. Try again.",
    ],
    [
      'an archived-account refusal',
      new TransactionAccountArchivedError('source', makeTestAccount({ name: 'Old Card' })),
      Strings.transactionAccountArchived('Old Card'),
    ],
    [
      'an unstorable amount',
      new TransactionAmountError('internal', 'unstorable'),
      Strings.addTxErrAmountUnstorable,
    ],
    [
      'a destination too small',
      new TransactionAmountError('internal', 'zero-destination'),
      Strings.addTxErrDestinationTooSmall,
    ],
    [
      'a card credit past the card balance',
      { issues: [{ code: 'card_credit_exceeds_liability' }] },
      Strings.addTxErrCardCreditExceedsLiability,
    ],
    [
      'a card payment past the card balance',
      { issues: [{ code: 'cc_payment_exceeds_liability' }] },
      Strings.addTxErrCcPaymentExceedsLiability,
    ],
  ])('carries %s to the track as its shipped line', (_label, error, line) => {
    expect(
      resolveTransactionFormStatus({ errors: {}, saveError: resolveTransactionSaveError(error) }),
    ).toBe(line);
  });
});

describe('MA-111 account strip resolvers', () => {
  const bank = makeTestAccount({ id: 'bank', name: 'Bank', type: AccountType.Bank });
  const usdBank = makeTestAccount({
    id: 'usd-bank',
    name: 'USD Bank',
    type: AccountType.Bank,
    currency: Currency.USD,
  });
  const card = makeTestAccount({ id: 'card', name: 'Visa', type: AccountType.CreditCard });
  const card2 = makeTestAccount({ id: 'card-2', name: 'Master', type: AccountType.CreditCard });
  const accounts = [bank, card, usdBank, card2];

  it.each([TransactionType.Expense, TransactionType.Income])(
    '%s offers every account in list order',
    (type) => {
      expect(resolveEligibleFromAccounts(type, accounts)).toEqual([bank, card, usdBank, card2]);
    },
  );

  it.each([TransactionType.Transfer, TransactionType.CCPayment])(
    '%s drops the credit cards and keeps list order',
    (type) => {
      expect(resolveEligibleFromAccounts(type, accounts)).toEqual([bank, usdBank]);
    },
  );

  it('rings the selected account when it is eligible', () => {
    expect(resolveStripSelectedId([bank, usdBank], 'usd-bank')).toBe('usd-bank');
  });

  it('rings no tile for a card the Transfer list excludes', () => {
    const eligible = resolveEligibleFromAccounts(TransactionType.Transfer, accounts);
    expect(resolveStripSelectedId(eligible, 'card')).toBeUndefined();
  });

  it('rings no tile when no account is chosen', () => {
    expect(resolveStripSelectedId([bank, usdBank], '')).toBeUndefined();
  });

  it('preselects the first eligible account at the first ready state', () => {
    expect(
      resolveAccountPreselect({
        ready: true,
        done: false,
        accountId: '',
        eligible: [bank, usdBank],
      }),
    ).toEqual({ done: true, account: bank });
  });

  it.each([
    ['not ready', { ready: false, done: false, accountId: '', eligible: [bank, usdBank] }, false],
    ['already done', { ready: true, done: true, accountId: '', eligible: [bank, usdBank] }, true],
    [
      'seeded',
      { ready: true, done: false, accountId: 'usd-bank', eligible: [bank, usdBank] },
      true,
    ],
    ['an empty list', { ready: true, done: false, accountId: '', eligible: [] }, true],
  ])('preselects nothing when %s', (_label, input, done) => {
    expect(resolveAccountPreselect(input)).toEqual({ done, account: undefined });
  });

  it('offers only the cards as a card payment destination', () => {
    expect(resolveEligibleToAccounts(TransactionType.CCPayment, accounts)).toEqual([card, card2]);
  });

  it('offers no card as a transfer destination', () => {
    expect(resolveEligibleToAccounts(TransactionType.Transfer, accounts)).toEqual([bank, usdBank]);
  });

  it.each([TransactionType.Expense, TransactionType.Income])(
    '%s leaves the destination list unchanged',
    (type) => {
      expect(resolveEligibleToAccounts(type, accounts)).toBe(accounts);
    },
  );
});

describe('MA-122 locked strip and To row face', () => {
  const HOLLOW = { color: AcctTokens.graphite.rich, hollow: true };
  const cash = makeTestAccount({
    id: 'cash',
    name: 'Cash',
    type: AccountType.PhysicalWallet,
    color: AcctTokens.nile.rich,
  });
  const bank = makeTestAccount({
    id: 'bank',
    name: 'Bank',
    type: AccountType.Bank,
    color: AcctTokens.midnight.rich,
  });
  const card = makeTestAccount({
    id: 'card',
    name: 'Visa',
    type: AccountType.CreditCard,
    color: AcctTokens.gold.rich,
  });
  const accounts = [cash, bank, card];

  it('locks an expense on its account first and dims the other active accounts in list order', () => {
    expect(
      resolveLockedStripChips({
        type: TransactionType.Expense,
        currentId: 'bank',
        current: bank,
        accounts,
      }),
    ).toEqual([
      {
        id: 'bank',
        name: 'Bank',
        tile: { color: AcctTokens.midnight.rich, type: AccountType.Bank, hollow: false },
        selected: true,
        locked: true,
        dimmed: false,
      },
      {
        id: 'cash',
        name: 'Cash',
        tile: { color: AcctTokens.nile.rich, type: AccountType.PhysicalWallet, hollow: false },
        selected: false,
        locked: false,
        dimmed: true,
      },
      {
        id: 'card',
        name: 'Visa',
        tile: { color: AcctTokens.gold.rich, type: AccountType.CreditCard, hollow: false },
        selected: false,
        locked: false,
        dimmed: true,
      },
    ]);
  });

  it.each([TransactionType.Transfer, TransactionType.CCPayment])(
    'locked %s dims no credit card',
    (type) => {
      const chips = resolveLockedStripChips({ type, currentId: 'bank', current: bank, accounts });
      expect(chips).toEqual([
        expect.objectContaining({ id: 'bank', locked: true }),
        expect.objectContaining({ id: 'cash', dimmed: true }),
      ]);
    },
  );

  it('draws an archived current account first with its filled tile and no other archived chip', () => {
    const archived = makeTestAccount({
      id: 'old',
      name: 'Old Bank',
      type: AccountType.Bank,
      color: AcctTokens.plum.rich,
      is_archived: 1,
    });
    const chips = resolveLockedStripChips({
      type: TransactionType.Expense,
      currentId: 'old',
      current: archived,
      accounts,
    });
    expect(chips[0]).toEqual({
      id: 'old',
      name: 'Old Bank',
      tile: { color: AcctTokens.plum.rich, type: AccountType.Bank, hollow: false },
      selected: true,
      locked: true,
      dimmed: false,
    });
    expect(chips).toEqual([
      expect.objectContaining({ id: 'old' }),
      expect.objectContaining({ id: 'cash', dimmed: true }),
      expect.objectContaining({ id: 'bank', dimmed: true }),
      expect.objectContaining({ id: 'card', dimmed: true }),
    ]);
  });

  it('names a deleted current account Deleted Account on the hollow graphite tile', () => {
    const deleted = makeTestAccount({
      id: 'gone',
      name: '',
      type: AccountType.Bank,
      is_deleted: 1,
    });
    const [first] = resolveLockedStripChips({
      type: TransactionType.Expense,
      currentId: 'gone',
      current: deleted,
      accounts,
    });
    expect(first).toMatchObject({
      id: 'gone',
      name: Strings.deletedAccount,
      tile: HOLLOW,
      selected: true,
      locked: true,
      dimmed: false,
    });
  });

  it('names an unresolved current account Unknown account on the hollow graphite tile', () => {
    const chips = resolveLockedStripChips({
      type: TransactionType.Expense,
      currentId: 'missing',
      current: undefined,
      accounts,
    });
    expect(chips[0]).toMatchObject({
      id: 'missing',
      name: Strings.unknownAccount,
      tile: HOLLOW,
      selected: true,
      locked: true,
    });
    expect(chips).toEqual([
      expect.objectContaining({ id: 'missing' }),
      expect.objectContaining({ id: 'cash', dimmed: true }),
      expect.objectContaining({ id: 'bank', dimmed: true }),
      expect.objectContaining({ id: 'card', dimmed: true }),
    ]);
  });

  it('rings the eligible selected account on the add strip, none locked or dimmed', () => {
    const chips = resolveAccountStripChips([cash, bank], 'bank');
    expect(chips).toEqual([
      {
        id: 'cash',
        name: 'Cash',
        tile: { color: AcctTokens.nile.rich, type: AccountType.PhysicalWallet, hollow: false },
        selected: false,
        locked: false,
        dimmed: false,
      },
      {
        id: 'bank',
        name: 'Bank',
        tile: { color: AcctTokens.midnight.rich, type: AccountType.Bank, hollow: false },
        selected: true,
        locked: false,
        dimmed: false,
      },
    ]);
  });

  it('rings no chip on the add strip for a card the Transfer list excludes', () => {
    const eligible = resolveEligibleFromAccounts(TransactionType.Transfer, accounts);
    const chips = resolveAccountStripChips(eligible, resolveStripSelectedId(eligible, 'card'));
    expect(chips).toEqual([
      expect.objectContaining({ id: 'cash', selected: false }),
      expect.objectContaining({ id: 'bank', selected: false }),
    ]);
  });

  it('rings no chip on the add strip when no account is chosen', () => {
    const chips = resolveAccountStripChips([cash, bank], undefined);
    expect(chips).toEqual([
      expect.objectContaining({ id: 'cash', selected: false }),
      expect.objectContaining({ id: 'bank', selected: false }),
    ]);
  });

  it('offers the To pick title and no tile on an unlocked empty To row', () => {
    expect(resolveToRowFace({ locked: false, account: undefined })).toEqual({
      value: Strings.addTxPickToTitle,
      tile: undefined,
    });
  });

  it.each([true, false])('names a live To account with no tile when locked is %s', (locked) => {
    expect(resolveToRowFace({ locked, account: bank })).toEqual({ value: 'Bank', tile: undefined });
  });

  it.each([true, false])(
    'draws a deleted To account as Deleted Account on the hollow tile when locked is %s',
    (locked) => {
      const deleted = makeTestAccount({ id: 'gone', name: '', is_deleted: 1 });
      const face = resolveToRowFace({ locked, account: deleted });
      expect(face.value).toBe(Strings.deletedAccount);
      expect(face.value).not.toBe(Strings.addTxPickToTitle);
      expect(face.tile).toMatchObject(HOLLOW);
    },
  );

  it('draws a locked unresolved To account as Unknown account on the hollow tile', () => {
    const face = resolveToRowFace({ locked: true, account: undefined });
    expect(face.value).toBe(Strings.unknownAccount);
    expect(face.tile).toMatchObject(HOLLOW);
  });
});

describe('resolveTransactionFormFooterVisible', () => {
  it.each([
    { formDataReady: false, hasAccounts: false },
    { formDataReady: false, hasAccounts: true },
    { formDataReady: true, hasAccounts: false },
    { formDataReady: true, hasAccounts: true },
  ])('hides the footer while form data has failed (%o)', (input) => {
    expect(resolveTransactionFormFooterVisible({ formDataLoadError: true, ...input })).toBe(false);
  });

  it.each([true, false])(
    'shows the footer while form data loads, hasAccounts %s',
    (hasAccounts) => {
      expect(
        resolveTransactionFormFooterVisible({
          formDataLoadError: false,
          formDataReady: false,
          hasAccounts,
        }),
      ).toBe(true);
    },
  );

  it('shows the footer once form data is ready with accounts', () => {
    expect(
      resolveTransactionFormFooterVisible({
        formDataLoadError: false,
        formDataReady: true,
        hasAccounts: true,
      }),
    ).toBe(true);
  });

  it('hides the footer once form data is ready with no accounts', () => {
    expect(
      resolveTransactionFormFooterVisible({
        formDataLoadError: false,
        formDataReady: true,
        hasAccounts: false,
      }),
    ).toBe(false);
  });
});

describe('MA-169 resolveRateCommit', () => {
  it.each([
    ['49', { exchangeRate: '49', override: true }],
    ['50', { exchangeRate: '50', override: false }],
    ['50.0', { exchangeRate: '50', override: false }],
  ])('commits %p at a stored 50 as %p', (text, expected) => {
    expect(resolveRateCommit({ text, storedRate: 50 })).toEqual(expected);
  });

  it.each(['', '0', '-5', '48.', '50abc'])('refuses %p at a stored 50', (text) => {
    expect(resolveRateCommit({ text, storedRate: 50 })).toBeUndefined();
  });

  it('reads 0.0000001 at a stored 1e-7 as the stored rate, in positional text', () => {
    expect(resolveRateCommit({ text: '0.0000001', storedRate: 1e-7 })).toEqual({
      exchangeRate: '0.0000001',
      override: false,
    });
  });
});

describe('MA-170 applyRateCommit with no override setter', () => {
  it('writes 49 at a stored 50, clears the error once and returns true', () => {
    const clearError = jest.fn();
    const setExchangeRate = jest.fn();

    expect(applyRateCommit({ text: '49', storedRate: 50, clearError, setExchangeRate })).toBe(true);

    expect(clearError).toHaveBeenCalledTimes(1);
    expect(setExchangeRate).toHaveBeenCalledTimes(1);
    expect(setExchangeRate).toHaveBeenCalledWith('49');
  });
});

describe('MA-170 the stale check, the stored-rate line, the editor source and the row text', () => {
  const DAY_MS = 86_400_000;
  const after = (update: string, days: number) => Date.parse(update) + days * DAY_MS;

  describe('isRateStale', () => {
    it.each([
      ['2026-09-01T12:00:00.000Z'],
      ['2026-08-31T12:00:00.000Z'],
      ['2028-02-15T12:00:00.000Z'],
    ])('from %s: fresh at 29 and at exactly 30 days, stale at 31', (update) => {
      expect(isRateStale(update, after(update, 29))).toBe(false);
      expect(isRateStale(update, after(update, 30))).toBe(false);
      expect(isRateStale(update, after(update, 31))).toBe(true);
    });

    it('reads an update a day in the future as fresh', () => {
      const update = '2026-09-01T12:00:00.000Z';

      expect(isRateStale(update, after(update, -1))).toBe(false);
    });

    it.each([
      ['no update time', null],
      ['an unparseable update time', 'not a date'],
    ])('never reads stale for %s', (_label, update) => {
      expect(isRateStale(update, after('2026-09-01T12:00:00.000Z', 3650))).toBe(false);
    });
  });

  describe('formatStoredRateLine', () => {
    it('joins the stored line and the short date of the update', () => {
      expect(formatStoredRateLine('2026-09-01T12:00:00.000Z')).toBe(
        'Using stored rate · Last updated Sep 1, 2026',
      );
    });

    it('reads the stored line alone with no update time', () => {
      expect(formatStoredRateLine(null)).toBe('Using stored rate');
    });
  });

  describe('resolveRateEditorSource at a stored 50', () => {
    it.each(['50', '50.0'])('reads %p as the stored rate under the stored line', (draftText) => {
      expect(
        resolveRateEditorSource({
          draftText,
          storedRate: 50,
          rateUpdatedAt: '2026-09-01T12:00:00.000Z',
        }),
      ).toEqual({
        usesStoredRate: true,
        line: 'Using stored rate · Last updated Sep 1, 2026',
      });
      expect(resolveRateEditorSource({ draftText, storedRate: 50, rateUpdatedAt: null })).toEqual({
        usesStoredRate: true,
        line: 'Using stored rate',
      });
    });

    it.each(['49', '', '48.', '0', '50abc'])('reads %p as a custom rate', (draftText) => {
      expect(
        resolveRateEditorSource({
          draftText,
          storedRate: 50,
          rateUpdatedAt: '2026-09-01T12:00:00.000Z',
        }),
      ).toEqual({ usesStoredRate: false, line: 'Custom rate · EGP per 1 USD' });
    });
  });

  describe('formatRateRowValue', () => {
    it.each([
      ['52.137035', '52.14'],
      ['49', '49.00'],
      ['0.0000001', '0.0000001'],
      ['', ''],
      ['0', '0'],
    ])('prints %p as %p', (rateText, expected) => {
      expect(formatRateRowValue(rateText)).toBe(expected);
    });
  });
});

describe('MA-168 converted amount', () => {
  type ConvertInput = Parameters<typeof resolveConvertedAmount>[0];

  // A USD 100 expense at 49; each case names only the fields it changes.
  const convert = (input: Partial<ConvertInput>) =>
    resolveConvertedAmount({
      type: TransactionType.Expense,
      amountText: '100',
      sourceCurrency: Currency.USD,
      destinationCurrency: undefined,
      exchangeRateText: '49',
      ...input,
    });

  it.each([
    ['an expense', TransactionType.Expense],
    ['an income', TransactionType.Income],
  ] as const)('multiplies %s of USD 15 to EGP 735', (_label, type) => {
    const converted = convert({ type, amountText: '15' });

    expect(converted).toEqual({ amount: 735, currency: Currency.EGP });
    expect(formatConvertedAmount(converted)).toBe('≈ 735 EGP');
  });

  it.each([
    ['a transfer', TransactionType.Transfer],
    ['a card payment', TransactionType.CCPayment],
  ] as const)(
    'divides %s of EGP 5,000 into the USD 102.04 the destination receives',
    (_label, type) => {
      const converted = convert({
        type,
        amountText: '5000',
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
      });

      expect(converted).toEqual({ amount: 102.04, currency: Currency.USD });
      expect(formatConvertedAmount(converted)).toBe('≈ 102.04 USD');
    },
  );

  it('multiplies a USD 100 transfer to an EGP account to EGP 4,900', () => {
    const converted = convert({
      type: TransactionType.Transfer,
      destinationCurrency: Currency.EGP,
    });

    expect(converted).toEqual({ amount: 4900, currency: Currency.EGP });
    expect(formatConvertedAmount(converted)).toBe('≈ 4,900 EGP');
  });

  it('shows a USD to USD transfer as the EGP 4,900 the ledger stores, while the destination receives the 100', () => {
    const converted = convert({
      type: TransactionType.Transfer,
      destinationCurrency: Currency.USD,
    });

    expect(converted).toEqual({ amount: 4900, currency: Currency.EGP });
    expect(formatConvertedAmount(converted)).toBe('≈ 4,900 EGP');
    expect(
      resolveTransactionAmounts({
        type: TransactionType.Transfer,
        amount: 100,
        sourceCurrency: Currency.USD,
        destinationCurrency: Currency.USD,
        exchangeRate: 49,
      }),
    ).toMatchObject({ toAmount: 100, egpAmount: 4900 });
  });

  it.each([
    ['an EGP expense', { sourceCurrency: Currency.EGP }],
    [
      'an EGP to EGP transfer',
      {
        type: TransactionType.Transfer,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.EGP,
      },
    ],
    [
      'an EGP to EGP transfer with no rate',
      {
        type: TransactionType.Transfer,
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.EGP,
        exchangeRateText: '',
      },
    ],
  ] as const)('has no converted amount for %s', (_label, input) => {
    expect(convert(input)).toBeUndefined();
  });

  it('prints USD 0.01 as 0.49 EGP, never as zero', () => {
    const converted = convert({ amountText: '0.01' });

    expect(converted).toEqual({ amount: 0.49, currency: Currency.EGP });
    expect(formatConvertedAmount(converted)).toBe('≈ 0.49 EGP');
  });

  // The resolver rounds the amount to 1.00 first; one division of 1.005 by 40 gives 0.03.
  it('takes the resolver rounding: EGP 1.005 at 40 is USD 0.02', () => {
    expect(
      convert({
        type: TransactionType.Transfer,
        amountText: '1.005',
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRateText: '40',
      }),
    ).toEqual({ amount: 0.02, currency: Currency.USD });
  });

  it.each([
    ['no amount typed', { amountText: '' }],
    ['an amount the parser cannot read', { amountText: '1,23' }],
    ['an amount under the money floor', { amountText: '0.004' }],
    ['no rate with a USD side', { exchangeRateText: '' }],
    ['a rate half typed', { exchangeRateText: '49.' }],
    ['a rate of zero', { exchangeRateText: '0' }],
    ['a rate that is not a number', { exchangeRateText: 'abc' }],
    ['no source account', { sourceCurrency: undefined }],
    ['a USD transfer with no To account picked', { type: TransactionType.Transfer }],
    [
      'a destination leg that rounds to zero: 0.2 EGP at 50',
      {
        type: TransactionType.Transfer,
        amountText: '0.2',
        sourceCurrency: Currency.EGP,
        destinationCurrency: Currency.USD,
        exchangeRateText: '50',
      },
    ],
    ['an amount of 20 digits', { amountText: '99999999999999999999' }],
  ] as const)('reads a dash for %s', (_label, input) => {
    const converted = convert(input);

    expect(converted).toBeUndefined();
    expect(formatConvertedAmount(converted)).toBe('≈ —');
  });
});
