import { Strings } from '@/constants/strings';

describe('replacement account copy (E2, E3)', () => {
  it('the failure line never apologises', () => {
    expect(Strings.accountDetailDeleteError).not.toMatch(/sorry|apolog/i);
  });
});
