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

const UNREDESIGNED_OLD_VOICE_KEYS = [
  'startupErrorRetry',
  'categoriesLoadError',
  'categoriesRefreshError',
  'categoriesLoadRetry',
  'currencySaveError',
  'currencyFetchError',
  'dashboardLoadError',
  'dashboardRefreshError',
  'dashboardLoadRetry',
  'budgetLoadError',
  'budgetSaveError',
  'budgetPlanSaveError',
  'budgetPlanDeleteError',
  'budgetPlansDetailLoadError',
  'budgetCopyPreviewError',
  'budgetCopyError',
  'budgetDeleteError',
  'incomeSheetSaveError',
  'categoriesSaveError',
  'categoriesReassignError',
  'commitmentsSaveError',
] as const satisfies readonly (keyof typeof Strings)[];

function readsOldVoice(text: string): boolean {
  return /^Could not/.test(text) || text.includes('Please try again') || /^Retry\b/.test(text);
}

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

describe('pay sheet failure copy (MA-219)', () => {
  it('ships the failed pay write byte-exact', () => {
    expect(Strings.commitmentsPayError).toBe(
      "Couldn't save this payment. Nothing was changed. Try again.",
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
      expect(text).not.toMatch(/^Retry\b/);
    },
  );
});

describe('no failure string on a redesigned module speaks the old voice (MA-201)', () => {
  it('holds no string outside the unredesigned modules that opens with Could not, asks Please try again or reads Retry', () => {
    const exempt: ReadonlySet<string> = new Set(UNREDESIGNED_OLD_VOICE_KEYS);

    const offending = Object.entries(Strings)
      .filter(
        ([key, value]) => typeof value === 'string' && !exempt.has(key) && readsOldVoice(value),
      )
      .map(([key]) => key);

    expect(offending).toEqual([]);
  });

  it.each(UNREDESIGNED_OLD_VOICE_KEYS)(
    'exempts %s only while it still reads in the old voice',
    (key) => {
      const text: unknown = Strings[key];

      expect(typeof text).toBe('string');
      expect(typeof text === 'string' && readsOldVoice(text)).toBe(true);
    },
  );
});
