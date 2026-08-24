import { z } from 'zod';

import { Strings } from '@/constants/strings';
import { MIN_MONEY_AMOUNT, sumAllocations } from '@/utils/money';
import { parseDecimalText, parsePositiveDecimal } from '@/utils/parse_decimal';

export const budgetFormSchema = z.object({
  nameText: z.string().trim().min(1, Strings.budgetNameRequired),
  // Three checks in order, and the order is the contract: RHF renders the first
  // issue, so the pattern failure has to sit between `.min(1)` and the floor
  // check. Before the split, a half-typed '1.' was reported as being below the
  // 0.01 floor -- true of nothing the user did, and not actionable.
  limitText: z
    .string()
    .min(1, Strings.budgetAmountRequired)
    .refine((s) => parseDecimalText(s) !== undefined, Strings.errAmountInvalid)
    .refine((s) => parsePositiveDecimal(s) !== undefined, Strings.budgetAmountInvalid),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export const incomeFormSchema = z.object({
  // Same three-check order as `limitText` above. The MAX_SAFE_INTEGER ceiling
  // stays on the floor check with its existing message -- it is a bound on the
  // value, not on the pattern.
  amountText: z
    .string()
    .min(1, Strings.incomeSheetAmountRequired)
    .refine((text) => parseDecimalText(text) !== undefined, Strings.errAmountInvalid)
    .refine((text) => {
      const amount = parsePositiveDecimal(text);
      return amount !== undefined && amount <= Number.MAX_SAFE_INTEGER;
    }, Strings.incomeSheetAmountInvalid),
});

export type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export const spendingPlanFormSchema = z.object({
  nameText: z.string().trim().min(1, Strings.budgetPlanNameRequired),
  // Same three-check order as `limitText` above.
  totalText: z
    .string()
    .min(1, Strings.budgetPlanAmountRequired)
    .refine((s) => parseDecimalText(s) !== undefined, Strings.errAmountInvalid)
    .refine((s) => parsePositiveDecimal(s) !== undefined, Strings.budgetPlanAmountInvalid),
});

export type SpendingPlanFormValues = z.infer<typeof spendingPlanFormSchema>;

function isValidIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const spendingPlanDateSchema = z
  .string()
  .refine(isValidIsoCalendarDate, Strings.budgetPlanDateInvalid);

export const spendingPlanInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, Strings.budgetPlanNameRequired),
    startDate: spendingPlanDateSchema,
    endDate: spendingPlanDateSchema,
    totalAmount: z.number().refine((n) => n >= MIN_MONEY_AMOUNT, Strings.budgetPlanAmountInvalid),
    categories: z
      .array(
        z.object({
          categoryId: z.string().min(1),
          allocatedAmount: z
            .number()
            .refine((n) => n === 0 || n >= MIN_MONEY_AMOUNT, Strings.budgetPlanAllocationInvalid)
            .optional(),
        }),
      )
      .min(1, Strings.budgetPlanCategoryRequired),
  })
  .superRefine((value, context) => {
    if (value.endDate < value.startDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: Strings.budgetPlanDateInvalid,
      });
    }
    const categoryIds = value.categories.map((category) => category.categoryId);
    if (new Set(categoryIds).size !== categoryIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['categories'],
        message: Strings.budgetPlanDuplicateCategory,
      });
    }
    // Integer cents, through the same function the sheet's live helper line
    // uses. A float sum disagrees with itself in both directions: it refuses
    // 0.01 + 0.05 against 0.06, and it passes [0.335, 0.335, 0.33] against
    // 1.00 that the repository then rejects after rounding.
    const { isOver } = sumAllocations(
      value.categories.map((category) => category.allocatedAmount),
      value.totalAmount,
    );
    if (isOver) {
      context.addIssue({
        code: 'custom',
        path: ['categories'],
        message: Strings.budgetPlanAllocationOver,
      });
    }
  });

export type SpendingPlanInput = z.infer<typeof spendingPlanInputSchema>;
