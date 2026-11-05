import { Strings } from '@/constants/strings';

describe('archived detail copy (G2, G3)', () => {
  it.each([
    ['clash', () => Strings.accountsArchivedNameTaken],
    ['not restored', () => Strings.accountsArchivedRestoreError],
    ['load error', () => Strings.accountDetailLoadError],
  ])('the %s line says what changed without apologising', (_name, read) => {
    expect(read()).not.toMatch(/sorry|apolog/i);
  });
});
