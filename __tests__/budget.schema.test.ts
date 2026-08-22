import {
  budgetFormSchema,
  incomeFormSchema,
  spendingPlanFormSchema,
  spendingPlanInputSchema,
} from '@/utils/schemas/budget.schema';

// c8 step 1: `parseLimit` (a bare `Number(text.replace(/,/g, ''))`, no floor, no
// pattern) is deleted in favour of `parse_decimal.ts`'s `parsePositiveDecimal` /
// `parseNonNegativeDecimal`, routed through each schema's own `.refine`. These
// rows assert the same ground through the public schema surface `parseLimit`
// used to be tested through directly.
describe('text-amount schemas share the parse floor and DECIMAL_PATTERN', () => {
  const cases: Array<{
    label: string;
    parse: (text: string) => boolean;
  }> = [
    {
      label: 'budgetFormSchema.limitText',
      parse: (text) =>
        budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: text }).success,
    },
    {
      label: 'incomeFormSchema.amountText',
      parse: (text) => incomeFormSchema.safeParse({ amountText: text }).success,
    },
    {
      label: 'spendingPlanFormSchema.totalText',
      parse: (text) =>
        spendingPlanFormSchema.safeParse({ nameText: 'Trip', totalText: text }).success,
    },
  ];

  it.each(cases)('$label still accepts grouped and decimal amounts', ({ parse }) => {
    expect(parse('3,000')).toBe(true);
    expect(parse('1250.5')).toBe(true);
  });

  // Row 25, both halves: `1e-9` is closed by `DECIMAL_PATTERN` rejecting
  // exponent notation outright (never reaches the floor check), `0x10` is
  // closed the same way for hex. `1e3` and `12.` are the same pattern
  // tightening, already the account form's behaviour
  // (`add_account.schema.ts:13`) — a real keypad-flow change here, not a new
  // rule.
  it.each(cases)('$label rejects malformed numeric text', ({ parse }) => {
    for (const text of ['0x10', '1e-9', '1e3', '12.', 'Infinity', '']) {
      expect(parse(text)).toBe(false);
    }
  });

  // Layla row 21 / 22: a sub-cent amount is rejected at the field, on its raw
  // parsed value.
  it('budgetFormSchema.limitText rejects a sub-cent amount (Layla row 21)', () => {
    expect(
      budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: '0.005' }).success,
    ).toBe(false);
  });

  it('incomeFormSchema.amountText rejects a sub-cent amount (Layla row 22)', () => {
    expect(incomeFormSchema.safeParse({ amountText: '0.001' }).success).toBe(false);
  });

  it('budgetFormSchema rejects zero, a negative amount, and an empty name', () => {
    expect(budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: '0' }).success).toBe(
      false,
    );
    expect(budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: '-5' }).success).toBe(
      false,
    );
    expect(budgetFormSchema.safeParse({ nameText: '', limitText: '3,000' }).success).toBe(false);
    expect(budgetFormSchema.safeParse({ nameText: '   ', limitText: '3,000' }).success).toBe(false);
    expect(budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: '' }).success).toBe(
      false,
    );
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

  // Layla row 16: a total at or above the floor passes at the schema even
  // though it is not yet 2dp — rounding is the repository's job (283d
  // scenario 24), not the schema's.
  it('accepts a total amount above the floor with more than 2 decimals (Layla row 16)', () => {
    expect(
      spendingPlanInputSchema.safeParse({ ...validInput, totalAmount: 1000.005 }).success,
    ).toBe(true);
  });

  // Layla rows 17-20: `allocatedAmount` keeps its three-state shape —
  // `undefined` (unallocated), `0` (allocated nothing), and `[0.01, ∞)` are
  // all valid; only `(0, 0.01)` is rejected.
  it('accepts allocatedAmount undefined, 0, and 0.01 (Layla rows 17, 18, 20)', () => {
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        categories: [{ categoryId: 'cat_food' }],
      }).success,
    ).toBe(true);
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        categories: [{ categoryId: 'cat_food', allocatedAmount: 0 }],
      }).success,
    ).toBe(true);
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        categories: [{ categoryId: 'cat_food', allocatedAmount: 0.01 }],
      }).success,
    ).toBe(true);
  });

  it('rejects an allocation strictly between 0 and the floor (Layla row 19)', () => {
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        categories: [{ categoryId: 'cat_food', allocatedAmount: 0.005 }],
      }).success,
    ).toBe(false);
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
        'Amount must be at least 0.01',
        'Each allocation must be 0 or at least 0.01.',
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

  it.each(['abc', '2026-7-01', '2026-02-30', '2026-13-01'])(
    'rejects malformed or impossible calendar date %s',
    (invalidDate) => {
      expect(
        spendingPlanInputSchema.safeParse({ ...validInput, startDate: invalidDate }).success,
      ).toBe(false);
      expect(
        spendingPlanInputSchema.safeParse({ ...validInput, endDate: invalidDate }).success,
      ).toBe(false);
    },
  );

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
