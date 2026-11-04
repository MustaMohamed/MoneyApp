import { act, renderHook } from '@testing-library/react-native';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { RecurrencePeriod, RecurrencePreset } from '@/constants/enums';
import {
  type CommitmentFormSchedule,
  NO_SETTLED_DUE_DATES,
  resolveRepeatsRowValue,
} from '@/modules/commitments/screens/commitments/commitment_form.helpers';
import {
  buildAddDefaults,
  type CommitmentFormValues,
} from '@/modules/commitments/screens/commitments/commitment_form.shared';
import { useCommitmentFormBodyPickers } from '@/modules/commitments/screens/commitments/components/commitment_form_body.hook';
import { useCommitmentFormBodyState } from '@/modules/commitments/screens/commitments/components/commitment_form_body.state';
import { useRepeatsSheet } from '@/modules/commitments/screens/commitments/components/repeats_sheet.hook';

// Starts on today, Tue 20 Oct 2026, read at local noon.
const STARTS = '2026-10-20';
const NOW = new Date(2026, 9, 20, 12);

// The body as it composes the Repeats row and sheet: one form, one owner, one schedule from the watched fields.
function useRepeatsHarness(settledDueDates: readonly string[]) {
  const form = useForm<CommitmentFormValues>({
    defaultValues: { ...buildAddDefaults(), startDate: STARTS },
  });
  const pickers = useCommitmentFormBodyPickers();
  const [startDate, recurrenceEvery, recurrencePeriod, durationType, endAfterCount, endDate] =
    useWatch({
      control: form.control,
      name: [
        'startDate',
        'recurrenceEvery',
        'recurrencePeriod',
        'durationType',
        'endAfterCount',
        'endDate',
      ],
    });
  const schedule = useMemo<CommitmentFormSchedule>(
    () => ({
      startDate,
      recurrenceEvery,
      recurrencePeriod,
      durationType,
      endAfterCount,
      endDate,
    }),
    [startDate, recurrenceEvery, recurrencePeriod, durationType, endAfterCount, endDate],
  );
  const sheet = useRepeatsSheet(pickers.owner, form, schedule, settledDueDates, NOW);
  return {
    form,
    pickers,
    sheet,
    row: resolveRepeatsRowValue(recurrenceEvery, recurrencePeriod),
  };
}

type Harness = { current: ReturnType<typeof useRepeatsHarness> };

async function mount(settledDueDates: readonly string[] = NO_SETTLED_DUE_DATES): Promise<Harness> {
  const { result } = await renderHook(() => useRepeatsHarness(settledDueDates));
  return result;
}

// The row tap: seeds the draft from the form's cadence and opens the sheet.
async function tapRow(result: Harness) {
  await act(async () => {
    const { form, pickers } = result.current;
    pickers.openRepeatsSheet(form.getValues('recurrenceEvery'), form.getValues('recurrencePeriod'));
  });
}

async function closeWithoutDone(result: Harness) {
  await act(async () => result.current.pickers.closeChoiceSheet());
}

async function stageThreeWeeks(result: Harness) {
  await act(async () => result.current.sheet.pickPreset(RecurrencePreset.Custom));
  await act(async () => result.current.sheet.setEvery(3));
  await act(async () => result.current.sheet.setPeriod(RecurrencePeriod.Weeks));
}

const formCadence = (result: Harness) => ({
  every: result.current.form.getValues('recurrenceEvery'),
  period: result.current.form.getValues('recurrencePeriod'),
});

beforeEach(() => {
  useCommitmentFormBodyState.getState().reset();
});

describe('useRepeatsSheet (MA-276)', () => {
  it('opened on Every month lights Monthly, and Custom reads Every 2 months with its next day', async () => {
    const result = await mount();
    expect(result.current.sheet.state.draft).toBeUndefined();
    expect(result.current.sheet.state.label).toBeUndefined();
    expect(result.current.sheet.state.track).toBeUndefined();

    await tapRow(result);

    expect(result.current.pickers.state.choiceSheet).toBe('repeats');
    expect(result.current.sheet.state).toEqual({
      draft: { preset: RecurrencePreset.Monthly, every: 1, period: RecurrencePeriod.Months },
      label: 'Every month',
      track: 'Every month · next Fri 20 Nov',
      isCustom: false,
    });

    await act(async () => result.current.sheet.pickPreset(RecurrencePreset.Custom));

    expect(result.current.sheet.state).toEqual({
      draft: { preset: RecurrencePreset.Custom, every: 2, period: RecurrencePeriod.Months },
      label: 'Every 2 months',
      track: 'Every 2 months · next Sun 20 Dec',
      isCustom: true,
    });
    expect(formCadence(result)).toEqual({ every: 1, period: RecurrencePeriod.Months });
  });

  it('Weekly reads Every week with the day 7 days after Starts, and after Done the label equals the row', async () => {
    const result = await mount();
    await tapRow(result);

    await act(async () => result.current.sheet.pickPreset(RecurrencePreset.Weekly));

    expect(result.current.sheet.state.track).toBe('Every week · next Tue 27 Oct');
    const label = result.current.sheet.state.label;
    await act(async () => result.current.sheet.done());

    expect(result.current.row).toBe(label);
    expect(result.current.row).toBe('Every week');
  });

  it('on edit, a settled next cycle moves the track to the cycle after it', async () => {
    const result = await mount(['2026-11-20']);

    await tapRow(result);

    expect(result.current.sheet.state.track).toBe('Every month · next Sun 20 Dec');
  });

  it('a step to 3 then weeks reads Every 3 weeks', async () => {
    const result = await mount();
    await tapRow(result);

    await stageThreeWeeks(result);

    expect(result.current.sheet.state).toEqual({
      draft: { preset: RecurrencePreset.Custom, every: 3, period: RecurrencePeriod.Weeks },
      label: 'Every 3 weeks',
      track: 'Every 3 weeks · next Tue 10 Nov',
      isCustom: true,
    });
  });

  it('Done writes 3 weeks to the form, the row reads Every 3 weeks, and the sheet closes', async () => {
    const result = await mount();
    await tapRow(result);
    await stageThreeWeeks(result);

    await act(async () => result.current.sheet.done());

    expect(formCadence(result)).toEqual({ every: 3, period: RecurrencePeriod.Weeks });
    expect(result.current.row).toBe('Every 3 weeks');
    expect(result.current.pickers.state.choiceSheet).toBeUndefined();
  });

  it('a close without Done leaves the form at 1 month, and the next open lights Monthly', async () => {
    const result = await mount();
    await tapRow(result);
    await stageThreeWeeks(result);

    await closeWithoutDone(result);

    expect(formCadence(result)).toEqual({ every: 1, period: RecurrencePeriod.Months });
    expect(result.current.row).toBe('Every month');

    await tapRow(result);

    expect(result.current.sheet.state).toEqual({
      draft: { preset: RecurrencePreset.Monthly, every: 1, period: RecurrencePeriod.Months },
      label: 'Every month',
      track: 'Every month · next Fri 20 Nov',
      isCustom: false,
    });
  });

  it('Done after the close writes nothing', async () => {
    const result = await mount();
    await tapRow(result);
    await stageThreeWeeks(result);
    await closeWithoutDone(result);

    await act(async () => result.current.sheet.done());

    expect(formCadence(result)).toEqual({ every: 1, period: RecurrencePeriod.Months });
    expect(result.current.row).toBe('Every month');
    expect(result.current.pickers.state.choiceSheet).toBeUndefined();
  });
});
