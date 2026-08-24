import { Strings } from '@/constants/strings';
import {
  budgetFormSchema,
  incomeFormSchema,
  spendingPlanFormSchema,
  spendingPlanInputSchema,
} from '@/utils/schemas/budget.schema';

/**
 * The message a field actually renders. RHF reports one error per field, the
 * first issue, so `issues[0]` is the user-visible verdict and the refine order
 * is what decides it.
 */
type ParseOutcome =
  | { success: true }
  | { success: false; error: { issues: { message: string }[] } };

function firstIssueMessage(result: ParseOutcome): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message;
}

// c8 step 1: `parseLimit` (a bare `Number(text.replace(/,/g, ''))`, no floor, no
// pattern) is deleted in favour of `parse_decimal.ts`'s `parsePositiveDecimal` /
// `parseNonNegativeDecimal`, routed through each schema's own `.refine`. These
// rows assert the same ground through the public schema surface `parseLimit`
// used to be tested through directly.
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

  // The refine split. All three fields raised one message for two different
  // failures: '1.' -- what a half-typed decimal looks like at submit -- was
  // reported as being below the 0.01 floor, which is not what is wrong with it
  // and not something the user can act on. The pattern failure now answers
  // first, and 'Numbers only.' already ships in exactly this role.
  //
  // The mask does not make this refine dead code: it admits '1.', '.' and '.5',
  // every one of which DECIMAL_PATTERN rejects, so these are precisely the
  // strings a mid-typing submit produces.
  it.each(cases)(
    '$label reports an incomplete decimal as a pattern failure',
    ({ firstMessage }) => {
      for (const text of ['1.', '.', '.5']) {
        expect(firstMessage(text)).toBe(Strings.errAmountInvalid);
      }
    },
  );

  // Green on `main`, and this row and the next each fire on a different real
  // mis-implementation -- measured, not assumed, because the obvious guess is
  // wrong here. Swapping the two refines does NOT red this row: '0.005' clears
  // DECIMAL_PATTERN and fails only the floor in either order. What reds it is
  // writing the pattern leg with the floor parser (`parsePositiveDecimal` in
  // place of `parseDecimalText`), which turns every sub-cent amount into
  // 'Numbers only.' and loses the one message that names the minimum.
  it.each(cases)(
    '$label still reports a sub-cent amount as a floor failure',
    ({ firstMessage, floorMessage }) => {
      expect(firstMessage('0.005')).toBe(floorMessage);
    },
  );

  // The other half: the new refine must not shadow `.min(1)`. Moving it in
  // front reds this row -- measured -- because parseDecimalText('') is
  // undefined, so a blank field would read 'Numbers only.' instead of naming
  // what it wants.
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

  // Schema-contract only: this proves the refine itself, not that a real
  // input reaches it as typed. Reachability through the allocation field
  // is proven at spending_plan_sheet_hook.test.ts, where parseOptionalAmount
  // (spending_plan_sheet.hook.ts) is what used to collapse a sub-floor value
  // to `undefined` before it ever got here.
  it('rejects an allocation strictly between 0 and the floor', () => {
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        categories: [{ categoryId: 'cat_food', allocatedAmount: 0.005 }],
      }).success,
    ).toBe(false);
  });

  // totalAmount's own floor, isolated from the object-level over-allocation
  // superRefine: nothing is allocated, so only the `.refine` on totalAmount
  // itself can reject this.
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

  // The over-allocation check runs on integer cents. A float sum puts
  // 0.01 + 0.05 at 0.060000000000000005, over a total of 0.06 -- the smallest
  // plan this schema used to refuse for no reason the user could see.
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

  // Both allocations round to 0.50, which is what gets written, and 0.50 twice
  // is exactly the total. Rejecting this on the raw sum 1.0098 refused a plan
  // that would have persisted correctly.
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

  // The converse, and the one this layer used to miss: the raw sum is exactly
  // 1.00, so a float comparison read `1 > 1` and passed it through, leaving the
  // repository to reject it after rounding. Each 0.335 rounds to 0.34, so the
  // values that would be written sum to 1.01.
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

  // Regression pin, green at base and newly load-bearing: `toCents(NaN)` is
  // NaN, which would make the whole comparison silently false. `z.number()`
  // is what keeps NaN off this path.
  it('rejects a NaN allocation before the sum comparison sees it', () => {
    expect(
      spendingPlanInputSchema.safeParse({
        ...validInput,
        categories: [{ categoryId: 'cat_food', allocatedAmount: Number.NaN }],
      }).success,
    ).toBe(false);
  });
});
