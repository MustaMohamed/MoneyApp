import { z } from 'zod';

import { Strings } from '@/constants/strings';

export function parseLimit(text: string): number {
  return Number(text.replace(/,/g, ''));
}

export const budgetFormSchema = z.object({
  nameText: z.string().trim().min(1, Strings.budgetNameRequired),
  limitText: z
    .string()
    .min(1, Strings.budgetAmountRequired)
    .refine((s) => {
      const n = parseLimit(s);
      return Number.isFinite(n) && n > 0;
    }, Strings.budgetAmountInvalid),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export const spendingPlanFormSchema = z.object({
  nameText: z.string().trim().min(1, Strings.budgetPlanNameRequired),
  totalText: z
    .string()
    .min(1, Strings.budgetPlanAmountRequired)
    .refine((s) => {
      const n = parseLimit(s);
      return Number.isFinite(n) && n > 0;
    }, Strings.budgetPlanAmountInvalid),
});

export type SpendingPlanFormValues = z.infer<typeof spendingPlanFormSchema>;

export const spendingPlanInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, Strings.budgetPlanNameRequired),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    totalAmount: z.number().positive(Strings.budgetPlanAmountInvalid),
    categories: z
      .array(
        z.object({
          categoryId: z.string().min(1),
          allocatedAmount: z.number().nonnegative(Strings.budgetPlanAllocationInvalid).optional(),
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
    const allocated = value.categories.reduce(
      (total, category) => total + (category.allocatedAmount ?? 0),
      0,
    );
    if (allocated > value.totalAmount) {
      context.addIssue({
        code: 'custom',
        path: ['categories'],
        message: Strings.budgetPlanAllocationOver,
      });
    }
  });

export type SpendingPlanInput = z.infer<typeof spendingPlanInputSchema>;
