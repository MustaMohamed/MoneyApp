import { Strings } from '@/constants/strings';

const ACCOUNTS_FAILURE_KEYS = [
  'accountActivityLoadError',
  'accountActivityLoadRetry',
  'accountBalanceReviewError',
  'accountDetailArchiveError',
  'accountDetailDeleteError',
  'accountDetailLoadError',
  'accountDetailLoadRetry',
  'accountsArchivedRestoreError',
  'accountsReadErrorDescription',
  'accountsReadErrorRetry',
  'accountsReadErrorTitle',
  'accountsReorderError',
  'adjustBalanceSaveError',
  'editAccountSaveError',
  'errAccountSaveFailed',
] as const;

describe('account detail failure copy (MA-201)', () => {
  it('ships the balance review confirm failure byte-exact', () => {
    expect(Strings.accountBalanceReviewError).toBe(
      "Couldn't confirm this balance. Nothing was changed.",
    );
  });

  it('ships the adjust balance save failure byte-exact', () => {
    expect(Strings.adjustBalanceSaveError).toBe(
      "Couldn't save this balance. Nothing was changed. Try again.",
    );
  });
});

describe('the accounts failure keys speak the accounts voice (MA-201)', () => {
  it.each(ACCOUNTS_FAILURE_KEYS)(
    '%s opens with no Could not, asks no Please try again, reads no Retry',
    (key) => {
      const text = Strings[key];

      expect(text).not.toMatch(/^Could not/);
      expect(text).not.toContain('Please try again');
      expect(text).not.toBe('Retry');
    },
  );
});
