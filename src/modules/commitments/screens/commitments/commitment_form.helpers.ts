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
import { selectNewDueDates } from '@/modules/commitments/domain/due_date_selection';
import {
  resolveHollowGraphiteTile,
  toAccountStripChip,
} from '@/modules/transactions/components/transaction_row.helpers';
import { computeDueDates } from '@/utils/compute_due_dates';
import { formatAmount } from '@/utils/format_amount';
import { formatShortWeekdayDate, formatWeekdayDate } from '@/utils/format_date';
import { formatStoredMoneyText } from '@/utils/money_text';
import { parseTypingDecimalText } from '@/utils/parse_decimal';
import { orderByRank } from '@/utils/rank_order';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

import { buildCommitmentEndsLabel } from '../../utils/commitment_ends_label';
import { buildRecurrenceLabel } from '../../utils/recurrence_label';
import {
  COMMITMENT_AMOUNT_REFUSES_ZERO,
  type CommitmentFormValues,
  ENDS_AFTER_COUNT_MIN,
  ENDS_AFTER_START_COUNT,
  type EndsDraft,
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

const ENDS_OPTION_RANK = {
  [DurationType.Forever]: 1,
  [DurationType.AfterCount]: 2,
  [DurationType.UntilDate]: 3,
} satisfies Record<DurationType, number>;

const ENDS_OPTION_LABELS: Record<DurationType, string> = {
  [DurationType.Forever]: Strings.commitmentsEndsOptionNever,
  [DurationType.AfterCount]: Strings.commitmentsEndsOptionAfterCount,
  [DurationType.UntilDate]: Strings.commitmentsEndsOptionUntilDate,
};

export function resolveEndsOptions(): { value: DurationType; label: string }[] {
  return orderByRank(ENDS_OPTION_RANK).map((type) => ({
    value: type,
    label: ENDS_OPTION_LABELS[type],
  }));
}

/** The Ends sheet opens on the form's choice; a day earlier than Starts opens at Starts, while the row keeps the stored day. */
export function seedEndsDraft(
  values: Pick<CommitmentFormValues, 'durationType' | 'endAfterCount' | 'endDate' | 'startDate'>,
): EndsDraft {
  const { durationType, endAfterCount, endDate, startDate } = values;
  const count =
    typeof endAfterCount === 'number' && endAfterCount >= ENDS_AFTER_COUNT_MIN
      ? endAfterCount
      : ENDS_AFTER_START_COUNT;
  let date = `${startDate.slice(0, 4)}-12-31`;
  if (endDate) date = endDate < startDate ? startDate : endDate;
  return { type: durationType, count, date };
}

/** Done writes the chosen type and its own field; the other type's field stays as held, since both saves null it. */
export function applyEndsDraft(
  form: Pick<UseFormReturn<CommitmentFormValues>, 'setValue' | 'trigger'>,
  draft: EndsDraft,
  isSubmitted: boolean,
): void {
  form.setValue('durationType', draft.type, SET_OPTS);
  if (draft.type === DurationType.AfterCount) form.setValue('endAfterCount', draft.count, SET_OPTS);
  if (draft.type === DurationType.UntilDate) setCommitmentEndDate(form, draft.date, isSubmitted);
  if (isSubmitted) void form.trigger(['endAfterCount', 'endDate']);
}

type EndsPreview = {
  type: DurationType.AfterCount | DurationType.UntilDate;
  count: number;
  day: string;
};

/** The count and day the chosen Ends type previews; nothing for Never or an incomplete count or date. */
function resolveEndsPreview(
  schedule: CommitmentFormSchedule,
  settledDueDates: readonly string[],
): EndsPreview | undefined {
  const { durationType, endAfterCount, endDate } = schedule;
  if (durationType === DurationType.AfterCount && isCompleteEndsCount(endAfterCount)) {
    const day = resolveEndsLastDueDate(schedule, endAfterCount, settledDueDates);
    return day === undefined
      ? undefined
      : { type: DurationType.AfterCount, count: endAfterCount, day };
  }
  if (durationType === DurationType.UntilDate && endDate) {
    const count = countEndsThroughDate(schedule, endDate, settledDueDates);
    return { type: DurationType.UntilDate, count, day: endDate };
  }
  return undefined;
}

function countedText(
  n: number,
  one: (day: string) => string,
  many: (count: string, day: string) => string,
  day: string,
): string {
  return n === 1 ? one(day) : many(formatAmount(n), day);
}

function formatEndsRowValue(
  schedule: CommitmentFormSchedule,
  preview: EndsPreview | undefined,
): string {
  const { durationType, endAfterCount, endDate } = schedule;
  if (durationType === DurationType.Forever) return Strings.commitmentsEndsRowNever;
  if (preview !== undefined) {
    const day = formatWeekdayDate(preview.day);
    return preview.type === DurationType.AfterCount
      ? countedText(
          preview.count,
          Strings.commitmentsEndsAfterPreviewOne,
          Strings.commitmentsEndsAfterPreviewMany,
          day,
        )
      : countedText(
          preview.count,
          Strings.commitmentsEndsOnDatePreviewOne,
          Strings.commitmentsEndsOnDatePreviewMany,
          day,
        );
  }
  return buildCommitmentEndsLabel({
    duration_type: durationType,
    end_after_count: endAfterCount ?? null,
    end_date: endDate === '' ? null : (endDate ?? null),
  });
}

function formatEndsSheetLine(preview: EndsPreview | undefined): string | undefined {
  if (preview === undefined) return undefined;
  const day = formatWeekdayDate(preview.day);
  return preview.type === DurationType.AfterCount
    ? Strings.commitmentsEndsLastPayment(day)
    : countedText(
        preview.count,
        Strings.commitmentsEndsThroughLineOne,
        Strings.commitmentsEndsThroughLineMany,
        day,
      );
}

/** The Ends row reads `Never` from its own key, a complete count or date as its preview, and otherwise as the detail's Ends fact. */
export function resolveEndsRowValue(
  schedule: CommitmentFormSchedule,
  settledDueDates: readonly string[],
): string {
  return formatEndsRowValue(schedule, resolveEndsPreview(schedule, settledDueDates));
}

/** The Ends sheet's track and line from one read of the staged schedule. */
export function resolveEndsSheetPreview(
  schedule: CommitmentFormSchedule,
  settledDueDates: readonly string[],
): { track: string; line: string | undefined } {
  const preview = resolveEndsPreview(schedule, settledDueDates);
  return { track: formatEndsRowValue(schedule, preview), line: formatEndsSheetLine(preview) };
}

function isCompleteEndsCount(count: number | null | undefined): count is number {
  return typeof count === 'number' && count >= ENDS_AFTER_COUNT_MIN;
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

export interface CommitmentFormSchedule {
  startDate: string;
  recurrenceEvery: number | null | undefined;
  recurrencePeriod: RecurrencePeriod;
  durationType: DurationType;
  endAfterCount?: number | null;
  endDate?: string;
}

function scheduleCadence(schedule: CommitmentFormSchedule) {
  return {
    startDate: schedule.startDate,
    every: schedule.recurrenceEvery ?? 1,
    period: schedule.recurrencePeriod,
  };
}

/** The add form holds no paid or skipped rows. */
export const NO_SETTLED_DUE_DATES: readonly string[] = Object.freeze([]);

/** The day of the latest row After `count` leaves: the settled rows, then the save's selection of new ones. */
export function resolveEndsLastDueDate(
  schedule: CommitmentFormSchedule,
  count: number,
  settledDueDates: readonly string[],
): string | undefined {
  const dates = computeDueDates({
    ...scheduleCadence(schedule),
    durationType: DurationType.AfterCount,
    endAfterCount: count,
    maxCount: count,
  });
  const selected = selectNewDueDates(dates, new Set(settledDueDates), {
    durationType: DurationType.AfterCount,
    endAfterCount: count,
  });
  return [...settledDueDates, ...selected].reduce<string | undefined>(
    (latest, date) => (latest === undefined || date > latest ? date : latest),
    undefined,
  );
}

/** The rows the whole schedule holds through `day`: the settled ones through it, then the save's selection of new ones. */
export function countEndsThroughDate(
  schedule: CommitmentFormSchedule,
  day: string,
  settledDueDates: readonly string[],
): number {
  const settled = new Set(settledDueDates);
  const dates = computeDueDates({
    ...scheduleCadence(schedule),
    durationType: DurationType.UntilDate,
    endDate: day,
    throughDate: day,
  });
  const selected = selectNewDueDates(dates, settled, {
    durationType: DurationType.UntilDate,
    endAfterCount: null,
  });
  let settledThrough = 0;
  for (const date of settled) if (date <= day) settledThrough += 1;
  return settledThrough + selected.length;
}

/** The first due day after `today` the save leaves unpaid, read past the generation window. */
export function resolveRepeatsNextDueDate(
  schedule: CommitmentFormSchedule,
  settledDueDates: readonly string[],
  today: string,
): string | undefined {
  const settled = new Set(settledDueDates);
  const input = {
    ...scheduleCadence(schedule),
    durationType: schedule.durationType,
    endAfterCount: schedule.endAfterCount ?? undefined,
    endDate: schedule.endDate,
  };
  // Of the settled + 1 schedule days after today at most `settled.size` are settled, so one stays unpaid.
  const maxCount = computeDueDates({ ...input, throughDate: today }).length + settled.size + 1;
  const selected = selectNewDueDates(computeDueDates({ ...input, maxCount }), settled, {
    durationType: schedule.durationType,
    endAfterCount: schedule.endAfterCount ?? null,
  });
  return selected.find((date) => date > today);
}

/** The Repeats sheet's track and Custom line: the label, and the next due day when the schedule has one. */
export function resolveRepeatsTrack(
  schedule: CommitmentFormSchedule,
  settledDueDates: readonly string[],
  today: string,
): string {
  const label = resolveRepeatsRowValue(schedule.recurrenceEvery ?? 1, schedule.recurrencePeriod);
  const next = resolveRepeatsNextDueDate(schedule, settledDueDates, today);
  return next === undefined
    ? label
    : Strings.commitmentsRepeatsNext(label, formatShortWeekdayDate(next, today));
}

export function resolveCommitmentFirstPaymentFootnote(
  schedule: CommitmentFormSchedule,
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
