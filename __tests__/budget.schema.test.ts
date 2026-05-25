import { budgetFormSchema, parseLimit } from '@/utils/schemas/budget.schema';

describe('parseLimit', () => {
  it('strips grouping commas and parses to a number', () => {
    expect(parseLimit('3,000')).toBe(3000);
    expect(parseLimit('1250.5')).toBe(1250.5);
  });
});

describe('budgetFormSchema', () => {
  it('accepts a positive amount', () => {
    expect(budgetFormSchema.safeParse({ limitText: '3,000' }).success).toBe(true);
  });
  it('rejects empty', () => {
    expect(budgetFormSchema.safeParse({ limitText: '' }).success).toBe(false);
  });
  it('rejects zero and negatives', () => {
    expect(budgetFormSchema.safeParse({ limitText: '0' }).success).toBe(false);
    expect(budgetFormSchema.safeParse({ limitText: '-5' }).success).toBe(false);
  });
  it('rejects non-numeric', () => {
    expect(budgetFormSchema.safeParse({ limitText: 'abc' }).success).toBe(false);
  });
});
