import { budgetFormSchema, parseLimit } from '@/utils/schemas/budget.schema';

describe('parseLimit', () => {
  it('strips grouping commas and parses to a number', () => {
    expect(parseLimit('3,000')).toBe(3000);
    expect(parseLimit('1250.5')).toBe(1250.5);
  });
});

describe('budgetFormSchema', () => {
  it('accepts a name and positive amount', () => {
    expect(
      budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: '3,000' }).success,
    ).toBe(true);
  });
  it('rejects an empty name', () => {
    expect(budgetFormSchema.safeParse({ nameText: '', limitText: '3,000' }).success).toBe(false);
    expect(budgetFormSchema.safeParse({ nameText: '   ', limitText: '3,000' }).success).toBe(false);
  });
  it('rejects empty', () => {
    expect(budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: '' }).success).toBe(
      false,
    );
  });
  it('rejects zero and negatives', () => {
    expect(budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: '0' }).success).toBe(
      false,
    );
    expect(budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: '-5' }).success).toBe(
      false,
    );
  });
  it('rejects non-numeric', () => {
    expect(budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: 'abc' }).success).toBe(
      false,
    );
  });
});
