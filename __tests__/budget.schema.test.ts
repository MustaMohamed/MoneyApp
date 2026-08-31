import { Strings } from '@/constants/strings';
import {
  budgetFormSchema,
  incomeFormSchema,
  spendingPlanFormSchema,
  spendingPlanInputSchema,
} from '@/utils/schemas/budget.schema';

// RHF renders only the first issue, so refine order decides the user-visible message.
type ParseOutcome =
  | { success: true }
  | { success: false; error: { issues: { message: string }[] } };

function firstIssueMessage(result: ParseOutcome): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('text-amount schemas share the parse floor and DECIMAL_PATTERN', () => {
  const cases: Array<{
    label: string;
    parse: (text: string) => boolean;
    firstMessage: (text: string) => string | undefined;
    requiredMessage: string;
    floorMessage: string;
  }> = [
    {
      label: 'budgetFormSchema.limitText',
      parse: (text) =>
        budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: text }).success,
      firstMessage: (text) =>
        firstIssueMessage(
          budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: text }),
        ),
      requiredMessage: Strings.budgetAmountRequired,
      floorMessage: Strings.budgetAmountInvalid,
    },
    {
      label: 'incomeFormSchema.amountText',
      parse: (text) => incomeFormSchema.safeParse({ amountText: text }).success,
      firstMessage: (text) => firstIssueMessage(incomeFormSchema.safeParse({ amountText: text })),
      requiredMessage: Strings.incomeSheetAmountRequired,
      floorMessage: Strings.incomeSheetAmountInvalid,
    },
    {
      label: 'spendingPlanFormSchema.totalText',
      parse: (text) =>
        spendingPlanFormSchema.safeParse({ nameText: 'Trip', totalText: text }).success,
      firstMessage: (text) =>
        firstIssueMessage(spendingPlanFormSchema.safeParse({ nameText: 'Trip', totalText: text })),
      requiredMessage: Strings.budgetPlanAmountRequired,
      floorMessage: Strings.budgetPlanAmountInvalid,
    },
  ];

  it.each(cases)('$label still accepts grouped and decimal amounts', ({ parse }) => {
    expect(parse('3,000')).toBe(true);
    expect(parse('1250.5')).toBe(true);
  });

  it.each(cases)('$label rejects malformed numeric text', ({ parse }) => {
    for (const text of ['0x10', '1e-9', '1e3', '12.', 'Infinity', '']) {
      expect(parse(text)).toBe(false);
    }
  });

  it('budgetFormSchema.limitText rejects a sub-cent amount (Layla row 21)', () => {
    expect(
      budgetFormSchema.safeParse({ nameText: 'Monthly Food', limitText: '0.005' }).success,
    ).toBe(false);
  });

  it('incomeFormSchema.amountText rejects a sub-cent amount (Layla row 22)', () => {
    expect(incomeFormSchema.safeParse({ amountText: '0.001' }).success).toBe(false);
  });

  // The input mask admits '1.', '.' and '.5', so these mid-typing strings do reach the schema.
  it.each(cases)(
    '$label reports an incomplete decimal as a pattern failure',
    ({ firstMessage }) => {
      for (const text of ['1.', '.', '.5']) {
        expect(firstMessage(text)).toBe(Strings.errAmountInvalid);
      }
    },
  );

  it.each(cases)(
    '$label still reports a sub-cent amount as a floor failure',
    ({ firstMessage, floorMessage }) => {
      expect(firstMessage('0.005')).toBe(floorMessage);
    },
  );

  // The pattern refine must stay behind `.min(1)`; `parseDecimalText('')` is undefined.
  it.each(cases)(
    '$label still reports blank text as required',
    ({ firstMessage, requiredMessage }) => {
      expect(firstMessage('')).toBe(requiredMessage);
    },
  );

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

  // Rounding to 2dp belongs to the repository, not the schema.
  it('accepts a total amount above the floor with more than 2 decimals (Layla row 16)', () => {
    expect(
      spendingPlanInputSchema.safeParse({ ...validInput, totalAmount: 1000.005 }).success,
    ).toBe(true);
  });

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

  it('rejects an allocation strictly between 0 and the floor', () => {
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        categories: [{ categoryId: 'cat_food', allocatedAmount: 0.005 }],
      }).success,
    ).toBe(false);
  });

  // Nothing is allocated, so only `totalAmount`'s own refine can reject this.
  it('rejects a total strictly between 0 and the floor, with nothing allocated', () => {
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        totalAmount: 0.006,
        categories: [{ categoryId: 'cat_food' }],
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

  // 0.01 + 0.05 is 0.060000000000000005 in floats; the check compares integer cents.
  it('accepts allocations whose float sum only appears to exceed the total', () => {
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        totalAmount: 0.06,
        categories: [
          { categoryId: 'cat_food', allocatedAmount: 0.01 },
          { categoryId: 'cat_travel', allocatedAmount: 0.05 },
        ],
      }).success,
    ).toBe(true);
  });

  // Each 0.5049 rounds to the 0.50 that is written, so the written values total exactly 1.
  it('accepts sub-cent allocations that round down to the total', () => {
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        totalAmount: 1,
        categories: [
          { categoryId: 'cat_food', allocatedAmount: 0.5049 },
          { categoryId: 'cat_travel', allocatedAmount: 0.5049 },
        ],
      }).success,
    ).toBe(true);
  });

  // The raw sum is exactly 1, but each 0.335 rounds to 0.34, so the written values total 1.01.
  it('rejects allocations that round up past the total', () => {
    const result = spendingPlanInputSchema.safeParse({
      ...validInput,
      totalAmount: 1,
      categories: [
        { categoryId: 'cat_food', allocatedAmount: 0.335 },
        { categoryId: 'cat_travel', allocatedAmount: 0.335 },
        { categoryId: 'cat_bills', allocatedAmount: 0.33 },
      ],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      'Allocations exceed the plan total.',
    );
  });

  // `toCents(NaN)` is NaN, which makes the sum comparison silently false; `z.number()` blocks it.
  it('rejects a NaN allocation before the sum comparison sees it', () => {
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        categories: [{ categoryId: 'cat_food', allocatedAmount: Number.NaN }],
      }).success,
    ).toBe(false);
  });
});
