import { Strings } from '@/constants/strings';

describe('accounts list load-error copy (F1)', () => {
  it('ships the three F1 strings byte-exact', () => {
    expect(Strings.accountsReadErrorTitle).toBe("Couldn't load your accounts");
    expect(Strings.accountsReadErrorDescription).toBe(
      'Something went wrong reading your data. Your accounts are still there.',
    );
    expect(Strings.accountsReadErrorRetry).toBe('Try again');
  });

  it('says what changed without apologising', () => {
    expect(Strings.accountsReadErrorDescription).not.toMatch(/sorry/i);
    expect(Strings.accountsReadErrorDescription).not.toMatch(/apolog/i);
  });
});
