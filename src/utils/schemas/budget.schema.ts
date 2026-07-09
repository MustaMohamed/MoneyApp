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
