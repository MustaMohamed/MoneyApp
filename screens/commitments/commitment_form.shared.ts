import { z } from 'zod';

import {
  AmountType,
  Currency,
  DurationType,
  RecurrencePeriod,
  RecurrencePreset,
} from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Commitment } from '@/database/entities/commitment.entity';

export const COMMITMENT_SCHEMA = z
  .object({
    amountType: z.nativeEnum(AmountType),
    name: z
      .string()
      .min(1, Strings.commitmentsErrNameRequired)
      .max(50, Strings.commitmentsErrNameMax),
    amount: z
      .number({ error: Strings.commitmentsErrAmountRequired })
      .positive(Strings.commitmentsErrAmountPositive)
      .optional(),
    currency: z.nativeEnum(Currency),
    categoryId: z.string().min(1, Strings.commitmentsErrCategoryRequired),
    recurrenceEvery: z
      .number()
      .int()
      .min(1, Strings.commitmentsErrEveryMin)
      .max(365, Strings.commitmentsErrEveryMax),
    recurrencePeriod: z.nativeEnum(RecurrencePeriod),
    startDate: z.string().min(1, Strings.commitmentsErrStartDateRequired),
    accountId: z.string().optional(),
    notes: z.string().optional(),
    durationType: z.nativeEnum(DurationType),
    endDate: z.string().optional(),
    endAfterCount: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.amountType === AmountType.Fixed && data.amount === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: Strings.commitmentsErrAmountRequired,
        path: ['amount'],
      });
    }
    if (data.durationType === DurationType.UntilDate && !data.endDate) {
      ctx.addIssue({
        code: 'custom',
        message: Strings.commitmentsErrEndDateRequired,
        path: ['endDate'],
      });
    }
    if (data.durationType === DurationType.AfterCount && !data.endAfterCount) {
      ctx.addIssue({
        code: 'custom',
        message: Strings.commitmentsErrAfterCountRequired,
        path: ['endAfterCount'],
      });
    }
  });

export type CommitmentFormValues = z.infer<typeof COMMITMENT_SCHEMA>;

export const PRESET_MAP: Record<
  RecurrencePreset,
  { every: number; period: RecurrencePeriod } | null
> = {
  [RecurrencePreset.Monthly]: { every: 1, period: RecurrencePeriod.Months },
  [RecurrencePreset.Weekly]: { every: 1, period: RecurrencePeriod.Weeks },
  [RecurrencePreset.Annually]: { every: 1, period: RecurrencePeriod.Years },
  [RecurrencePreset.Custom]: null,
};

export function buildAddDefaults(): CommitmentFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    amountType: AmountType.Fixed,
    name: '',
    amount: undefined,
    currency: Currency.EGP,
    categoryId: '',
    recurrenceEvery: 1,
    recurrencePeriod: RecurrencePeriod.Months,
    startDate: today,
    accountId: undefined,
    notes: undefined,
    durationType: DurationType.Forever,
    endDate: undefined,
    endAfterCount: undefined,
  };
}

export function buildEditDefaults(c: Commitment): CommitmentFormValues {
  return {
    amountType: c.amount_type,
    name: c.name,
    amount: c.amount ?? undefined,
    currency: c.currency,
    categoryId: c.category_id,
    recurrenceEvery: c.recurrence_every,
    recurrencePeriod: c.recurrence_period,
    startDate: c.start_date,
    accountId: c.account_id ?? undefined,
    notes: c.notes ?? undefined,
    durationType: c.duration_type,
    endDate: c.end_date ?? undefined,
    endAfterCount: c.end_after_count ?? undefined,
  };
}

export function detectPreset(every: number, period: RecurrencePeriod): RecurrencePreset {
  if (every === 1 && period === RecurrencePeriod.Months) return RecurrencePreset.Monthly;
  if (every === 1 && period === RecurrencePeriod.Weeks) return RecurrencePreset.Weekly;
  if (every === 1 && period === RecurrencePeriod.Years) return RecurrencePreset.Annually;
  return RecurrencePreset.Custom;
}
