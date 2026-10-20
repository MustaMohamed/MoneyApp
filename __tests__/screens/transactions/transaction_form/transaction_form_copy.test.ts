import { Strings } from '@/constants/strings';

describe('add and edit sheet copy', () => {
  it('titles the sheet in sentence case', () => {
    expect(Strings.addTxTitle).toBe('Add transaction');
    expect(Strings.editTxTitle).toBe('Edit transaction');
  });

  it('labels the primary action Save on add and Save changes on edit', () => {
    expect(Strings.addTxSaveCta).toBe('Save');
    expect(Strings.editTxSaveCta).toBe('Save changes');
  });

  it('drops the dead edit title key and keeps the shipped CC Payment tab', () => {
    expect(Object.hasOwn(Strings, 'editTransaction')).toBe(false);
    expect(Strings.addTxTypeCCPayment).toBe('CC Payment');
  });
});

describe('MA-105 footer status track copy', () => {
  it('reads the save failure as the canvas Copy note wrote it', () => {
    expect(Strings.transactionSaveError).toBe(
      "Couldn't save this transaction. Nothing was changed. Try again.",
    );
  });

  it('counts the fields at fault in the singular at 1 and the plural above', () => {
    expect(Strings.fixFieldsMarkedAbove(1)).toBe('Fix the 1 field marked above.');
    expect(Strings.fixFieldsMarkedAbove(2)).toBe('Fix the 2 fields marked above.');
  });

  it('keeps no string that still reads Could not save this transaction', () => {
    const stale = Object.entries(Strings).filter(
      ([, value]) => typeof value === 'string' && value.includes('Could not save this transaction'),
    );

    expect(stale).toEqual([]);
  });
});

describe('MA-106 saved toast and prerequisite state copy', () => {
  it('confirms a save as the canvas Copy note wrote it', () => {
    expect(Strings.transactionSavedToast).toBe('Transaction saved.');
  });

  it('reads the form data failure and its retry as written, beside the shipped no-accounts title', () => {
    expect(Strings.addTxDataLoadError).toBe("Couldn't load your accounts and categories.");
    expect(Strings.addTxDataLoadRetry).toBe('Try again');
    expect(Strings.addTxNoAccountsTitle).toBe('No Accounts Yet');
  });

  it('keeps no string that still reads Could not load the accounts and categories', () => {
    const stale = Object.entries(Strings).filter(
      ([, value]) =>
        typeof value === 'string' && value.includes('Could not load the accounts and categories'),
    );

    expect(stale).toEqual([]);
  });
});

describe('MA-169 rate editor copy', () => {
  it('titles the editor Rate, refuses a bad rate with one message, and takes the date picker sheet Cancel and Done', () => {
    expect(Strings.addTxRateLabel).toBe('Rate');
    expect(Strings.addTxErrRateInvalid).toBe('Enter a valid rate greater than 0');
    expect(Strings.addTxDatePickerCancel).toBe('Cancel');
    expect(Strings.addTxDatePickerDone).toBe('Done');
  });
});

describe('MA-168 converted amount copy', () => {
  it('prints the amount and its code after the sign on every pair, with no words after the code', () => {
    expect(Strings.addTxConvertedAmount('735 EGP')).toBe('≈ 735 EGP');
    expect(Strings.addTxConvertedAmount('102.04 USD')).toBe('≈ 102.04 USD');
  });

  it('reads a dash with no code when there is nothing to convert, and leaves the pay sheet its own preview string', () => {
    expect(Strings.addTxConvertedAmountNone).toBe('≈ —');
    expect(Strings.addTxEgpPreview).toBe('≈ {amount} EGP');
  });
});

describe('MA-097 budget lookup copy and the approved failure strings', () => {
  it("reads the Budget row's failed lookup as Couldn't load budgets. and its retry as Try again", () => {
    expect(Strings.addTxBudgetLookupError).toBe("Couldn't load budgets.");
    expect(Strings.addTxBudgetRetryA11y).toBe('Try again');
  });

  it('holds the four strings the #543 review approved', () => {
    expect([
      Strings.transactionsTotalsLoadError,
      Strings.transactionsAccountLookupError,
      Strings.addTxBudgetLookupError,
      Strings.addTxBudgetRetryA11y,
    ]).toEqual([
      "Couldn't load this month's figures.",
      "Couldn't load account names.",
      "Couldn't load budgets.",
      'Try again',
    ]);
  });

  it('keeps no string that still reads the old budget lookup failure or its retry', () => {
    const stale = Object.entries(Strings).filter(
      ([, value]) =>
        typeof value === 'string' &&
        (value.includes('Could not load matching budgets') ||
          value.includes('Retry matching budget lookup')),
    );

    expect(stale).toEqual([]);
  });

  it('drops the From Account picker title, which nothing reads', () => {
    expect(Object.hasOwn(Strings, 'addTxPickFromTitle')).toBe(false);
  });
});
