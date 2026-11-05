import { Strings } from '@/constants/strings';

describe('archived card copy (B4, B5, G3)', () => {
  it.each([
    ['clash', () => Strings.accountsArchivedNameTaken],
    ['failure', () => Strings.accountsArchivedRestoreError],
  ])('the %s line says what changed without apologising', (_name, read) => {
    expect(read()).not.toMatch(/sorry/i);
    expect(read()).not.toMatch(/apolog/i);
  });
});
