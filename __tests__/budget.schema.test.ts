import {
  budgetFormSchema,
  parseLimit,
  spendingPlanInputSchema,
} from '@/utils/schemas/budget.schema';

describe('parseLimit', () => {
  it('strips grouping commas and parses to a number', () => {
    expect(parseLimit('3,000')).toBe(3000);
    expect(parseLimit('1250.5')).toBe(1250.5);
  });
});

describe('spendingPlanInputSchema', () => {
  const validInput = {
    name: 'Trip',
    startDate: '2026-07-01',
    endDate: '2026-07-02',
    totalAmount: 1000,
    categories: [{ categoryId: 'cat_food', allocatedAmount: 500 }],
  };

  it('accepts a complete plan draft', () => {
    expect(spendingPlanInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('rejects invalid names, totals, and allocations', () => {
    const result = spendingPlanInputSchema.safeParse({
      ...validInput,
      name: '',
      totalAmount: 0,
      categories: [{ categoryId: 'cat_food', allocatedAmount: -1 }],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'Enter a plan name',
        'Enter a valid plan amount',
        'Each allocation must be zero or greater.',
      ]),
    );
  });

  it('rejects reversed dates and duplicate categories', () => {
    const result = spendingPlanInputSchema.safeParse({
      ...validInput,
      endDate: '2026-06-30',
      categories: [{ categoryId: 'cat_food' }, { categoryId: 'cat_food' }],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'End date must be on or after start date',
        'Select each category once.',
      ]),
    );
  });

  it('rejects allocations above the plan total', () => {
    const result = spendingPlanInputSchema.safeParse({
      ...validInput,
      categories: [
        { categoryId: 'cat_food', allocatedAmount: 700 },
        { categoryId: 'cat_travel', allocatedAmount: 700 },
      ],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      'Allocations exceed the plan total.',
    );
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
