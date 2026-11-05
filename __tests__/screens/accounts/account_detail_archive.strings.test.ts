import { Strings } from '@/constants/strings';

describe('archive confirmation copy (G2)', () => {
  it('says what changed without apologising', () => {
    expect(Strings.accountDetailArchiveError).not.toMatch(/sorry/i);
    expect(Strings.accountDetailArchiveError).not.toMatch(/apolog/i);
  });
});
