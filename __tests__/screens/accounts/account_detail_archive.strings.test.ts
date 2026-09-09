import { Strings } from '@/constants/strings';

describe('archive confirmation copy (G2)', () => {
  it('names the account in the title', () => {
    expect(Strings.accountDetailArchiveTitle('CIB Titanium')).toBe('Archive CIB Titanium?');
  });

  it('says the balance leaves net worth, which is what archiving does', () => {
    expect(Strings.accountDetailArchiveCCWarning('8,450 EGP')).toBe(
      'Its 8,450 EGP balance leaves your net worth until you unarchive it.',
    );
  });

  it('ships the failure line byte-exact', () => {
    expect(Strings.accountDetailArchiveError).toBe(
      "Couldn't archive this account. Nothing was changed.",
    );
  });

  it('says what changed without apologising', () => {
    expect(Strings.accountDetailArchiveError).not.toMatch(/sorry/i);
    expect(Strings.accountDetailArchiveError).not.toMatch(/apolog/i);
  });

  it('leaves the body unchanged', () => {
    expect(Strings.accountDetailArchiveBody).toBe(
      'This account will be hidden from your dashboard and all calculations.',
    );
  });
});
