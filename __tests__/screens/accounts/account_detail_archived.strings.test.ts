import { Strings } from '@/constants/strings';

describe('archived detail copy (G2, G3)', () => {
  it.each([
    ['banner title', () => Strings.accountDetailArchivedTitle, 'Archived'],
    [
      'banner body',
      () => Strings.accountDetailArchivedBody,
      'Hidden from your dashboard and totals. Its history stays.',
    ],
    ['hero label', () => Strings.accountDetailBalanceArchived, 'Balance when archived'],
    ['transactions row', () => Strings.accountDetailTransactionsLabel, 'Transactions'],
    ['commitments row', () => Strings.accountDetailCommitmentsLabel, 'Commitments paid from it'],
    ['action', () => Strings.accountDetailUnarchive, 'Unarchive'],
  ])('ships the %s byte-exact from the canvas', (_name, read, expected) => {
    expect(read()).toBe(expected);
  });

  it('names the restored account in the toast', () => {
    expect(Strings.accountsArchivedRestored('Old HSBC')).toBe('Old HSBC restored.');
  });

  it.each([
    ['clash', () => Strings.accountsArchivedNameTaken],
    ['not restored', () => Strings.accountsArchivedRestoreError],
    ['load error', () => Strings.accountDetailLoadError],
  ])('the %s line says what changed without apologising', (_name, read) => {
    expect(read()).not.toMatch(/sorry|apolog/i);
  });
});
