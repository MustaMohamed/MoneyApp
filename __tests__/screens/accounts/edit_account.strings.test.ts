import { Strings } from '@/constants/strings';

describe('edit account copy (D1, F3)', () => {
  it('counts one fault with the same template as many', () => {
    expect(Strings.editAccountFixFields(1)).toBe('Fix the 1 fields marked above.');
    expect(Strings.editAccountFixFields(3)).toBe('Fix the 3 fields marked above.');
  });

  it('ships the failure line byte-exact', () => {
    expect(Strings.editAccountSaveError).toBe(
      "Couldn't save your changes. Nothing was changed. Try again.",
    );
  });

  it('ships the idle footnote and the two lock helpers byte-exact', () => {
    expect(Strings.editAccountFootnote).toBe('Changes apply everywhere this account appears.');
    expect(Strings.editAccountTypeHelper).toBe('Set when the account was created.');
    expect(Strings.editAccountBalanceHelper).toBe(
      'Locked. Use Adjust balance for the current balance.',
    );
  });

  it('leaves the add form labels unchanged', () => {
    expect(Strings.accountNameLabel).toBe('Account name');
    expect(Strings.accountColorLabel).toBe('Account colour');
    expect(Strings.accountTypeLabel).toBe('Account type');
  });
});

describe('shared credit copy (D2, D3)', () => {
  it('ships the due-day helper and its range error byte-exact', () => {
    expect(Strings.accountDueDayHelper).toBe('Day of the month, 1 to 31.');
    expect(Strings.errDueDayRange).toBe('Between 1 and 31.');
  });

  it('ships the interest helper byte-exact', () => {
    expect(Strings.accountInterestHelper).toBe(
      'Estimate interest from the APR on the revolving balance.',
    );
  });

  it('suffixes APR with a percent sign', () => {
    expect(Strings.accountAprSuffix).toBe('%');
  });
});
