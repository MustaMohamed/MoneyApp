import { PROTECTED_CATEGORY_IDS } from '@/constants/enums';

describe('PROTECTED_CATEGORY_IDS', () => {
  it('contains cat_other_expense', () => {
    expect(PROTECTED_CATEGORY_IDS).toContain('cat_other_expense');
  });

  it('contains cat_other_income', () => {
    expect(PROTECTED_CATEGORY_IDS).toContain('cat_other_income');
  });

  it('has exactly 2 entries', () => {
    expect(PROTECTED_CATEGORY_IDS).toHaveLength(2);
  });

  it('isProtected returns true for cat_other_expense', () => {
    const isProtected = (id: string): boolean =>
      (PROTECTED_CATEGORY_IDS as readonly string[]).includes(id);
    expect(isProtected('cat_other_expense')).toBe(true);
  });

  it('isProtected returns false for cat_groceries', () => {
    const isProtected = (id: string): boolean =>
      (PROTECTED_CATEGORY_IDS as readonly string[]).includes(id);
    expect(isProtected('cat_groceries')).toBe(false);
  });
});
