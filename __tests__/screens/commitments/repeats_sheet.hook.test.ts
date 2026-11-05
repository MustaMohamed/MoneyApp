import { act, renderHook } from '@testing-library/react-native';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { DurationType, RecurrencePeriod, RecurrencePreset } from '@/constants/enums';
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
import { advanceTo, mockAppStateListeners, pinDate } from '@/test_helpers/clock';

// Starts on today, Tue 20 Oct 2026, read at local noon.
const STARTS = '2026-10-20';
const NOW = new Date(2026, 9, 20, 12);

// The body as it composes the Repeats row and sheet: one form, one owner, one schedule from the watched fields.
function useRepeatsHarness(settledDueDates: readonly string[], starts: string) {
  const form = useForm<CommitmentFormValues>({
    defaultValues: { ...buildAddDefaults(), startDate: starts },
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
  const sheet = useRepeatsSheet(pickers.owner, form, schedule, settledDueDates);
  return {
    form,
    pickers,
    sheet,
    row: resolveRepeatsRowValue(recurrenceEvery, recurrencePeriod),
  };
}

type Harness = { current: ReturnType<typeof useRepeatsHarness> };

async function mount(
  settledDueDates: readonly string[] = NO_SETTLED_DUE_DATES,
  starts: string = STARTS,
): Promise<Harness> {
  const { result } = await renderHook(() => useRepeatsHarness(settledDueDates, starts));
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
  pinDate(NOW);
  useCommitmentFormBodyState.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useRepeatsSheet (MA-276)', () => {
  it('opened on Every month lights Monthly, and Custom reads Every 2 months with its next day', async () => {
    const result = await mount();
    expect(result.current.sheet.state.draft).toBeUndefined();
    expect(result.current.sheet.state.track).toBeUndefined();

    await tapRow(result);

    expect(result.current.pickers.state.choiceSheet).toBe('repeats');
    expect(result.current.sheet.state).toEqual({
      draft: { preset: RecurrencePreset.Monthly, every: 1, period: RecurrencePeriod.Months },
      track: 'Every month · next Fri 20 Nov',
      isCustom: false,
    });

    await act(async () => result.current.sheet.pickPreset(RecurrencePreset.Custom));

    expect(result.current.sheet.state).toEqual({
      draft: { preset: RecurrencePreset.Custom, every: 2, period: RecurrencePeriod.Months },
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
    const label = resolveRepeatsRowValue(1, RecurrencePeriod.Weeks);
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

describe('across local midnight (MA-250)', () => {
  let appState: ReturnType<typeof mockAppStateListeners>;

  // Custom at every 1 in days, staged with no Done, so each day is a due day.
  async function stageEveryDay(result: Harness) {
    await tapRow(result);
    await act(async () => result.current.sheet.pickPreset(RecurrencePreset.Custom));
    await act(async () => result.current.sheet.setEvery(1));
    await act(async () => result.current.sheet.setPeriod(RecurrencePeriod.Days));
  }

  async function mountAt(minuteBefore: Date, starts: string, settled = NO_SETTLED_DUE_DATES) {
    jest.useFakeTimers({ now: minuteBefore });
    return mount(settled, starts);
  }

  beforeEach(() => {
    appState = mockAppStateListeners();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['2026-10-31', new Date(2026, 9, 31, 23, 59), 'Sun 1 Nov', 'Mon 2 Nov'],
    ['2028-02-28', new Date(2028, 1, 28, 23, 59), 'Tue 29 Feb', 'Wed 1 Mar'],
    ['2026-12-30', new Date(2026, 11, 31, 23, 59), 'Fri 1 Jan 2027', 'Sat 2 Jan'],
  ])(
    'Starts %s moves the next day past the new today with no input',
    async (starts, minuteBefore, before, after) => {
      const result = await mountAt(minuteBefore, starts);
      await stageEveryDay(result);
      expect(result.current.sheet.state.track).toBe(`Every day · next ${before}`);

      await advanceTo(new Date(minuteBefore.getTime() + 2 * 60_000));

      expect(result.current.sheet.state.track).toBe(`Every day · next ${after}`);
      expect(result.current.sheet.state.isCustom).toBe(true);
      expect(formCadence(result)).toEqual({ every: 1, period: RecurrencePeriod.Months });
    },
  );

  it('After 2 from Starts 2026-10-31 reads the label alone once its last day is today', async () => {
    const minuteBefore = new Date(2026, 9, 31, 23, 59);
    const result = await mountAt(minuteBefore, '2026-10-31');
    await act(async () => {
      result.current.form.setValue('durationType', DurationType.AfterCount);
      result.current.form.setValue('endAfterCount', 2);
    });
    await stageEveryDay(result);
    expect(result.current.sheet.state.track).toBe('Every day · next Sun 1 Nov');

    await advanceTo(new Date(2026, 10, 1, 0, 1));

    expect(result.current.sheet.state.track).toBe('Every day');
    expect(formCadence(result)).toEqual({ every: 1, period: RecurrencePeriod.Months });
  });

  it('on edit, a settled day after the new today is skipped', async () => {
    const minuteBefore = new Date(2026, 9, 31, 23, 59);
    const result = await mountAt(minuteBefore, '2026-10-30', ['2026-11-02']);
    await stageEveryDay(result);
    expect(result.current.sheet.state.track).toBe('Every day · next Sun 1 Nov');

    await advanceTo(new Date(2026, 10, 1, 0, 1));

    expect(result.current.sheet.state.track).toBe('Every day · next Tue 3 Nov');
    expect(formCadence(result)).toEqual({ every: 1, period: RecurrencePeriod.Months });
  });

  it('holds the day across a midnight passed in the background, and moves on the return to active', async () => {
    const minuteBefore = new Date(2026, 9, 31, 23, 59);
    const result = await mountAt(minuteBefore, '2026-10-31');
    await stageEveryDay(result);

    appState.setState('background');
    await advanceTo(new Date(2026, 10, 1, 0, 1));
    expect(result.current.sheet.state.track).toBe('Every day · next Sun 1 Nov');

    await act(async () => {
      appState.emit('active');
    });

    expect(result.current.sheet.state.track).toBe('Every day · next Mon 2 Nov');
    expect(formCadence(result)).toEqual({ every: 1, period: RecurrencePeriod.Months });
  });
});
