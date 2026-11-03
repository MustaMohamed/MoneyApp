import { act, renderHook } from '@testing-library/react-native';
import { useForm, useWatch } from 'react-hook-form';

import { RecurrencePeriod, RecurrencePreset } from '@/constants/enums';
import { resolveRepeatsRowValue } from '@/modules/commitments/screens/commitments/commitment_form.helpers';
import {
  buildAddDefaults,
  type CommitmentFormValues,
} from '@/modules/commitments/screens/commitments/commitment_form.shared';
import { useCommitmentFormBodyPickers } from '@/modules/commitments/screens/commitments/components/commitment_form_body.hook';
import { useCommitmentFormBodyState } from '@/modules/commitments/screens/commitments/components/commitment_form_body.state';
import { useRepeatsSheet } from '@/modules/commitments/screens/commitments/components/repeats_sheet.hook';

// The body as it composes the Repeats row and sheet: one form, one owner.
function useRepeatsHarness() {
  const form = useForm<CommitmentFormValues>({ defaultValues: buildAddDefaults() });
  const pickers = useCommitmentFormBodyPickers();
  const sheet = useRepeatsSheet(pickers.owner, form);
  const [every, period] = useWatch({
    control: form.control,
    name: ['recurrenceEvery', 'recurrencePeriod'],
  });
  return { form, pickers, sheet, row: resolveRepeatsRowValue(every, period) };
}

type Harness = { current: ReturnType<typeof useRepeatsHarness> };

async function mount(): Promise<Harness> {
  const { result } = await renderHook(() => useRepeatsHarness());
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
  await act(async () => result.current.pickers.setChoiceSheet(undefined));
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
  it('opened on Every month lights Monthly, and Custom reads Every 2 months', async () => {
    const result = await mount();
    expect(result.current.sheet.state.draft).toBeUndefined();
    expect(result.current.sheet.state.label).toBeUndefined();

    await tapRow(result);

    expect(result.current.pickers.state.choiceSheet).toBe('repeats');
    expect(result.current.sheet.state).toEqual({
      draft: { preset: RecurrencePreset.Monthly, every: 1, period: RecurrencePeriod.Months },
      label: 'Every month',
      isCustom: false,
    });

    await act(async () => result.current.sheet.pickPreset(RecurrencePreset.Custom));

    expect(result.current.sheet.state).toEqual({
      draft: { preset: RecurrencePreset.Custom, every: 2, period: RecurrencePeriod.Months },
      label: 'Every 2 months',
      isCustom: true,
    });
    expect(formCadence(result)).toEqual({ every: 1, period: RecurrencePeriod.Months });
  });

  it('a step to 3 then weeks reads Every 3 weeks', async () => {
    const result = await mount();
    await tapRow(result);

    await stageThreeWeeks(result);

    expect(result.current.sheet.state).toEqual({
      draft: { preset: RecurrencePreset.Custom, every: 3, period: RecurrencePeriod.Weeks },
      label: 'Every 3 weeks',
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
