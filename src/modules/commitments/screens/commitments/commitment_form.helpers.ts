import type { UseFormReturn } from 'react-hook-form';

import type { AccountStripChip } from '@/components/ui/form_sheet.helpers';
import {
  AccountType,
  DurationType,
  type RecurrencePeriod,
  RecurrencePreset,
} from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import {
  resolveHollowGraphiteTile,
  toAccountStripChip,
} from '@/modules/transactions/components/transaction_row.helpers';
import { computeDueDates } from '@/utils/compute_due_dates';
import { formatShortWeekdayDate } from '@/utils/format_date';
import { formatStoredMoneyText } from '@/utils/money_text';
import { parseTypingDecimalText } from '@/utils/parse_decimal';
import { orderByRank } from '@/utils/rank_order';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

import { buildCommitmentEndsLabel } from '../../utils/commitment_ends_label';
import { buildRecurrenceLabel } from '../../utils/recurrence_label';
import {
  COMMITMENT_AMOUNT_REFUSES_ZERO,
  type CommitmentFormValues,
  PRESET_MAP,
  REPEATS_CUSTOM_START_EVERY,
  type RepeatsDraft,
  SET_OPTS,
  detectPreset,
} from './commitment_form.shared';
import type { BodyFaultField } from './components/commitment_form_body.hook';

export const NO_ACCOUNT_CHIP_ID = 'no-account';

/** No account first; an archived or deleted account the form holds follows it, lit, until another chip is picked. */
export function resolveCommitmentStripChips(input: {
  activeAccounts: readonly Account[];
  accountId: string | undefined;
  accountsById: ReadonlyMap<string, Account>;
}): AccountStripChip[] {
  const { activeAccounts, accountId, accountsById } = input;
  const noAccount: AccountStripChip = {
    id: NO_ACCOUNT_CHIP_ID,
    name: Strings.commitmentsStripNoAccount,
    tile: resolveHollowGraphiteTile(AccountType.Bank),
    selected: accountId === undefined,
    locked: false,
    dimmed: false,
  };
  const held =
    accountId !== undefined && !activeAccounts.some((account) => account.id === accountId)
      ? [
          toAccountStripChip(accountId, accountsById.get(accountId), {
            selected: true,
            locked: false,
            dimmed: false,
          }),
        ]
      : [];
  return [
    noAccount,
    ...held,
    ...activeAccounts.map((account) =>
      toAccountStripChip(account.id, account, {
        selected: account.id === accountId,
        locked: false,
        dimmed: false,
      }),
    ),
  ];
}

export function resolveAccountIdFromChip(chipId: string): string | undefined {
  return chipId === NO_ACCOUNT_CHIP_ID ? undefined : chipId;
}

/** Unrounded: `roundMoney` at the repository write is the one rounding. */
export function parseCommitmentAmountText(text: string): number | undefined {
  return parseTypingDecimalText(text);
}

/** The hero's text for a stored amount; `undefined` keeps the text, which already parses to it. */
export function resolveAmountHeroSyncText(
  text: string,
  value: number | undefined,
): string | undefined {
  if (parseCommitmentAmountText(text) === value) return undefined;
  if (value === undefined) return '';
  return formatStoredMoneyText(value);
}

/** Holds a still-typing text; otherwise commits the parsed amount, which validates once submitted. */
export function applyCommitmentAmountText(
  form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue' | 'clearErrors'>,
  text: string,
  commit: (amount: number | undefined) => void,
): void {
  const amount = parseCommitmentAmountText(text);
  if (!holdStillTypingDecimal(form, 'amount', amount, COMMITMENT_AMOUNT_REFUSES_ZERO, text)) {
    commit(amount);
  }
}

/** A whole-number input's typed text as its field value: `null` once emptied, since `Controller` reads an `undefined` field back as its default; `undefined` for text that is not a number. */
export function parseWholeNumberInput(text: string): number | null | undefined {
  if (text === '') return null;
  const n = parseInt(text, 10);
  return isNaN(n) ? undefined : n;
}

export function resolveRepeatsRowValue(every: number, period: RecurrencePeriod): string {
  return buildRecurrenceLabel({ recurrence_every: every, recurrence_period: period });
}

/** The Repeats sheet opens on the form's cadence, lighting its preset or Custom. */
export function seedRepeatsDraft(every: number, period: RecurrencePeriod): RepeatsDraft {
  return { preset: detectPreset(every, period), every, period };
}

/** A preset row takes its cadence; Custom from a preset starts at 2 in that unit, and Custom while Custom keeps the draft. */
export function pickRepeatsPreset(draft: RepeatsDraft, preset: RecurrencePreset): RepeatsDraft {
  const mapped = PRESET_MAP[preset];
  if (mapped !== null) return { preset, every: mapped.every, period: mapped.period };
  if (draft.preset === RecurrencePreset.Custom) return draft;
  return { preset, every: REPEATS_CUSTOM_START_EVERY, period: draft.period };
}

const REPEATS_OPTION_RANK = {
  [RecurrencePreset.Weekly]: 1,
  [RecurrencePreset.Monthly]: 2,
  [RecurrencePreset.Annually]: 3,
  [RecurrencePreset.Custom]: 4,
} satisfies Record<RecurrencePreset, number>;

/** Each preset row reads as the Repeats row would read its cadence. */
export function resolveRepeatsOptions(): { value: RecurrencePreset; label: string }[] {
  return orderByRank(REPEATS_OPTION_RANK).map((preset) => {
    const mapped = PRESET_MAP[preset];
    return {
      value: preset,
      label:
        mapped === null
          ? Strings.commitmentsRecurrenceCustom
          : resolveRepeatsRowValue(mapped.every, mapped.period),
    };
  });
}

/** The Ends row reads `Never` from its own key, and otherwise as the detail's Ends fact, so a missing count or date reads the incomplete label. */
export function resolveEndsRowValue(
  durationType: DurationType,
  endAfterCount: number | null | undefined,
  endDate: string | undefined,
): string {
  if (durationType === DurationType.Forever) return Strings.commitmentsEndsRowNever;
  return buildCommitmentEndsLabel({
    duration_type: durationType,
    end_after_count: endAfterCount ?? null,
    end_date: endDate === '' ? null : (endDate ?? null),
  });
}

/** Once a Save ran, a Starts move re-reads an Ends day, whose check depends on both days. */
export function setCommitmentStartDate(
  form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue' | 'trigger' | 'getValues'>,
  next: string,
  isSubmitted: boolean,
): void {
  form.setValue('startDate', next, SET_OPTS);
  if (isSubmitted && form.getValues('endDate')) void form.trigger('endDate');
}

/** Before a Save an Ends day earlier than Starts rings nothing. */
export function setCommitmentEndDate(
  form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue'>,
  next: string,
  isSubmitted: boolean,
): void {
  form.setValue('endDate', next, { shouldDirty: true, shouldValidate: isSubmitted });
}

/** `endDate` has no `Controller`, so `resetField` keeps its value and its error: once a Save ran, an Ends choice re-reads it, unless Until holds no day yet. */
export function setCommitmentDurationType(
  form: Pick<
    UseFormReturn<CommitmentFormValues>,
    'setValue' | 'resetField' | 'trigger' | 'getValues'
  >,
  type: DurationType,
  isSubmitted: boolean,
): void {
  form.setValue('durationType', type, SET_OPTS);
  if (type !== DurationType.UntilDate) form.resetField('endDate', { defaultValue: undefined });
  if (type !== DurationType.AfterCount)
    form.resetField('endAfterCount', { defaultValue: undefined });
  if (isSubmitted && (type !== DurationType.UntilDate || form.getValues('endDate')))
    void form.trigger('endDate');
}

export function resolveCommitmentFirstPaymentFootnote(
  schedule: {
    startDate: string;
    recurrenceEvery: number | null | undefined;
    recurrencePeriod: RecurrencePeriod;
    durationType: DurationType;
    endAfterCount: number | null | undefined;
    endDate: string | undefined;
  },
  today: string,
): string | undefined {
  const dueDates = computeDueDates({
    startDate: schedule.startDate,
    every: schedule.recurrenceEvery ?? 1,
    period: schedule.recurrencePeriod,
    durationType: schedule.durationType,
    // An emptied count reads as 0 there, so the form hands it on as no count typed.
    endAfterCount: schedule.endAfterCount ?? undefined,
    endDate: schedule.endDate,
    maxCount: 1,
  });
  if (dueDates.length === 0) return undefined;
  return Strings.commitmentsFirstPaymentDue(formatShortWeekdayDate(dueDates[0], today));
}

/** A count on the Ends row and a date on it are one field; the strip error refuses nothing and sits outside `faults`. */
export function countCommitmentFormFaults(
  faults: Record<BodyFaultField, string | undefined>,
): number {
  const { endAfterCount, endDate, ...rows } = faults;
  return [...Object.values(rows), endAfterCount ?? endDate].filter((fault) => fault !== undefined)
    .length;
}

export function resolveCommitmentFormStatus(
  faults: Record<BodyFaultField, string | undefined>,
  saveError: string | undefined,
): string | undefined {
  const count = countCommitmentFormFaults(faults);
  return count > 0 ? Strings.fixFieldsMarkedAbove(count) : saveError;
}
