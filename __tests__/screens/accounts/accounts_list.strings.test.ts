import { Strings } from '@/constants/strings';

describe('accounts list load-error copy (F1)', () => {
  it('ships the three F1 strings byte-exact', () => {
    expect(Strings.accountsLoadErrorTitle).toBe("Couldn't load your accounts");
    expect(Strings.accountsLoadErrorDescription).toBe(
      'Something went wrong reading your data. Your accounts are still there.',
    );
    expect(Strings.accountsLoadErrorRetry).toBe('Try again');
  });

  it('says what changed without apologising', () => {
    expect(Strings.accountsLoadErrorDescription).not.toMatch(/sorry/i);
    expect(Strings.accountsLoadErrorDescription).not.toMatch(/apolog/i);
  });

  // `accountsLoadRetry` would pull the title into load_error_copy.test.ts's 13 and 7.
  it('names its retry label outside the LoadErrorAlert family convention', () => {
    expect(Object.prototype.hasOwnProperty.call(Strings, 'accountsLoadRetry')).toBe(false);
  });
});
