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
    amount_type: z.nativeEnum(AmountType),
    name: z
      .string()
      .min(1, Strings.commitmentsErrNameRequired)
      .max(50, Strings.commitmentsErrNameMax),
    amount: z
      .number({ error: Strings.commitmentsErrAmountRequired })
      .positive(Strings.commitmentsErrAmountPositive)
      .optional(),
    currency: z.nativeEnum(Currency),
    category_id: z.string().min(1, Strings.commitmentsErrCategoryRequired),
    recurrence_every: z
      .number()
      .int()
      .min(1, Strings.commitmentsErrEveryMin)
      .max(365, Strings.commitmentsErrEveryMax),
    recurrence_period: z.nativeEnum(RecurrencePeriod),
    start_date: z.string().min(1, Strings.commitmentsErrStartDateRequired),
    account_id: z.string().optional(),
    notes: z.string().optional(),
    duration_type: z.nativeEnum(DurationType),
    end_date: z.string().optional(),
    end_after_count: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.amount_type === AmountType.Fixed && !data.amount) {
      ctx.addIssue({
        code: 'custom',
        message: Strings.commitmentsErrAmountRequired,
        path: ['amount'],
      });
    }
    if (data.duration_type === DurationType.UntilDate && !data.end_date) {
      ctx.addIssue({
        code: 'custom',
        message: Strings.commitmentsErrEndDateRequired,
        path: ['end_date'],
      });
    }
    if (data.duration_type === DurationType.AfterCount && !data.end_after_count) {
      ctx.addIssue({
        code: 'custom',
        message: Strings.commitmentsErrAfterCountRequired,
        path: ['end_after_count'],
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
    amount_type: AmountType.Fixed,
    name: '',
    amount: undefined,
    currency: Currency.EGP,
    category_id: '',
    recurrence_every: 1,
    recurrence_period: RecurrencePeriod.Months,
    start_date: today,
    account_id: undefined,
    notes: undefined,
    duration_type: DurationType.Forever,
    end_date: undefined,
    end_after_count: undefined,
  };
}

export function buildEditDefaults(c: Commitment): CommitmentFormValues {
  return {
    amount_type: c.amount_type,
    name: c.name,
    amount: c.amount ?? undefined,
    currency: c.currency,
    category_id: c.category_id,
    recurrence_every: c.recurrence_every,
    recurrence_period: c.recurrence_period,
    start_date: c.start_date,
    account_id: c.account_id ?? undefined,
    notes: c.notes ?? undefined,
    duration_type: c.duration_type,
    end_date: c.end_date ?? undefined,
    end_after_count: c.end_after_count ?? undefined,
  };
}

export function detectPreset(every: number, period: RecurrencePeriod): RecurrencePreset {
  if (every === 1 && period === RecurrencePeriod.Months) return RecurrencePreset.Monthly;
  if (every === 1 && period === RecurrencePeriod.Weeks) return RecurrencePreset.Weekly;
  if (every === 1 && period === RecurrencePeriod.Years) return RecurrencePreset.Annually;
  return RecurrencePreset.Custom;
}
