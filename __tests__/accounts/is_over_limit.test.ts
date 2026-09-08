import { isOverLimit } from '@/modules/accounts/constants/is_over_limit';

describe('isOverLimit — the over-limit state shared by detail, dashboard and list', () => {
  it('is false when the balance is under the limit', () => {
    expect(isOverLimit(8450, 40000)).toBe(false);
  });
  it('is false when the balance is exactly at the limit', () => {
    expect(isOverLimit(40000, 40000)).toBe(false);
  });
  it('is true when the balance is over the limit', () => {
    expect(isOverLimit(45000, 40000)).toBe(true);
  });
  it('is false on a zero limit, whatever the balance', () => {
    expect(isOverLimit(45000, 0)).toBe(false);
  });
  it('is false on a null limit, whatever the balance', () => {
    expect(isOverLimit(45000, null)).toBe(false);
  });
});
