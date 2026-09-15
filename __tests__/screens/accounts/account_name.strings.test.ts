import { Strings } from '@/constants/strings';

describe('account name required copy (MA-054)', () => {
  it("ships MA-019's empty-name line byte-exact", () => {
    expect(Strings.errNameRequired).toBe('Enter a name for this account.');
  });
});
