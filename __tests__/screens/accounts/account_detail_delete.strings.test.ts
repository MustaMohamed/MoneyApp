import { Strings } from '@/constants/strings';

describe('delete confirmation copy (E1)', () => {
  it('the failure line never apologises', () => {
    expect(Strings.accountDetailDeleteError).not.toMatch(/sorry|apolog/i);
  });
});
