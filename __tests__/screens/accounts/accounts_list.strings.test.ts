import { Strings } from '@/constants/strings';

describe('accounts list load-error copy (F1)', () => {
  it('says what changed without apologising', () => {
    expect(Strings.accountsReadErrorDescription).not.toMatch(/sorry/i);
    expect(Strings.accountsReadErrorDescription).not.toMatch(/apolog/i);
  });
});
