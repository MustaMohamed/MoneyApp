import { Strings } from '@/constants/strings';

describe('archived card copy (B4, B5, G3)', () => {
  it('titles the card', () => {
    expect(Strings.accountsArchivedTitle).toBe('Archived');
  });

  it('joins the archived names with a comma and one space', () => {
    expect(Strings.accountsArchivedSummary(['Old HSBC', 'Vodafone Cash'])).toBe(
      'Old HSBC, Vodafone Cash',
    );
    expect(Strings.accountsArchivedSummary([])).toBe('');
  });

  it('captions a row with the type label and the stored balance', () => {
    expect(Strings.accountsArchivedRowCaption('Bank', '0 EGP')).toBe('Bank · 0 EGP');
  });

  it('labels the row action', () => {
    expect(Strings.accountsArchivedUnarchive).toBe('Unarchive');
  });

  it('names the restored account in the toast', () => {
    expect(Strings.accountsArchivedRestored('Old HSBC')).toBe('Old HSBC restored.');
  });

  it('ships the clash line byte-exact', () => {
    expect(Strings.accountsArchivedNameTaken).toBe(
      'An active account already has this name. Rename it first.',
    );
  });

  it('ships the failure line byte-exact', () => {
    expect(Strings.accountsArchivedRestoreError).toBe(
      "Couldn't restore this account. Nothing was changed.",
    );
  });

  it.each([
    ['clash', () => Strings.accountsArchivedNameTaken],
    ['failure', () => Strings.accountsArchivedRestoreError],
  ])('the %s line says what changed without apologising', (_name, read) => {
    expect(read()).not.toMatch(/sorry/i);
    expect(read()).not.toMatch(/apolog/i);
  });
});
