import { AmountType, RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';

export const COMMITMENT_AMOUNT_TYPE_OPTIONS = [
  {
    value: AmountType.Fixed,
    label: Strings.commitmentsAmountFixed,
    icon: 'lock-outline' as const,
  },
  {
    value: AmountType.Variable,
    label: Strings.commitmentsAmountVariable,
    icon: 'swap-vertical' as const,
  },
];

export const COMMITMENT_RECURRENCE_OPTIONS = [
  {
    value: RecurrencePreset.Monthly,
    label: Strings.commitmentsRecurrenceUnitMonths,
    icon: 'calendar-month-outline' as const,
  },
  {
    value: RecurrencePreset.Weekly,
    label: Strings.commitmentsRecurrenceUnitWeeks,
    icon: 'calendar-week-outline' as const,
  },
  {
    value: RecurrencePreset.Annually,
    label: Strings.commitmentsRecurrenceUnitYears,
    icon: 'calendar-star' as const,
  },
  {
    value: RecurrencePreset.Custom,
    label: Strings.commitmentsRecurrenceCustom,
    icon: 'calendar-sync-outline' as const,
  },
];
