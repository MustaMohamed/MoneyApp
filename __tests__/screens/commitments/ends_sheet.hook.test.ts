import { act, renderHook } from '@testing-library/react-native';
import { useForm, useWatch } from 'react-hook-form';

import { DurationType } from '@/constants/enums';
import { resolveEndsRowValue } from '@/modules/commitments/screens/commitments/commitment_form.helpers';
import {
  buildAddDefaults,
  type CommitmentFormValues,
} from '@/modules/commitments/screens/commitments/commitment_form.shared';
import { useCommitmentFormBodyPickers } from '@/modules/commitments/screens/commitments/components/commitment_form_body.hook';
import { useCommitmentFormBodyState } from '@/modules/commitments/screens/commitments/components/commitment_form_body.state';
import { useEndsSheet } from '@/modules/commitments/screens/commitments/components/ends_sheet.hook';

const STARTS = '2026-10-20';

type HeldEnds = Partial<Pick<CommitmentFormValues, 'durationType' | 'endAfterCount' | 'endDate'>>;

// The body as it composes the Ends row and sheet: one form, one owner.
function useEndsHarness(held: HeldEnds) {
  const form = useForm<CommitmentFormValues>({
    defaultValues: { ...buildAddDefaults(), startDate: STARTS, ...held },
  });
  const pickers = useCommitmentFormBodyPickers();
  const sheet = useEndsSheet(pickers.owner, form, false);
  const [durationType, endAfterCount, endDate] = useWatch({
    control: form.control,
    name: ['durationType', 'endAfterCount', 'endDate'],
  });
  return { form, pickers, sheet, row: resolveEndsRowValue(durationType, endAfterCount, endDate) };
}

type Harness = { current: ReturnType<typeof useEndsHarness> };

async function mount(held: HeldEnds = {}): Promise<Harness> {
  const { result } = await renderHook(() => useEndsHarness(held));
  return result;
}

// The row tap: seeds the draft from the form's Ends and Starts and opens the sheet.
async function tapRow(result: Harness) {
  await act(async () => {
    const { form, pickers } = result.current;
    pickers.openEndsSheet(form.getValues());
  });
}

async function closeWithoutDone(result: Harness) {
  await act(async () => result.current.pickers.closeChoiceSheet());
}

async function stageAfterThree(result: Harness) {
  await act(async () => result.current.sheet.pickType(DurationType.AfterCount));
  await act(async () => result.current.sheet.setCount(3));
}

const formEnds = (result: Harness) => ({
  durationType: result.current.form.getValues('durationType'),
  endAfterCount: result.current.form.getValues('endAfterCount'),
  endDate: result.current.form.getValues('endDate'),
});

const NEVER_HELD = {
  durationType: DurationType.Forever,
  endAfterCount: undefined,
  endDate: undefined,
};

beforeEach(() => {
  useCommitmentFormBodyState.getState().reset();
});

describe('useEndsSheet (MA-277)', () => {
  it('opened on a new form lights Never with the track Never', async () => {
    const result = await mount();
    expect(result.current.sheet.state).toEqual({ draft: undefined, track: undefined });

    await tapRow(result);

    expect(result.current.pickers.state.choiceSheet).toBe('ends');
    expect(result.current.sheet.state).toEqual({
      draft: { type: DurationType.Forever, count: 12, date: '2026-12-31' },
      track: 'Never',
    });
  });

  it.each<[string, HeldEnds, DurationType]>([
    ['Never', {}, DurationType.Forever],
    [
      'After a number of payments',
      { durationType: DurationType.AfterCount, endAfterCount: 5 },
      DurationType.AfterCount,
    ],
    [
      'On a date',
      { durationType: DurationType.UntilDate, endDate: '2027-03-15' },
      DurationType.UntilDate,
    ],
  ])('opened on a row reading %s lights that choice', async (_name, held, type) => {
    const result = await mount(held);

    await tapRow(result);

    expect(result.current.sheet.state.draft?.type).toBe(type);
  });

  it('Never chosen from After 3 reads the track Never, which Done writes to the row', async () => {
    const result = await mount({ durationType: DurationType.AfterCount, endAfterCount: 3 });
    expect(result.current.row).toBe('After 3 payments');
    await tapRow(result);

    await act(async () => result.current.sheet.pickType(DurationType.Forever));
    expect(result.current.sheet.state.track).toBe('Never');
    await act(async () => result.current.sheet.done());

    expect(formEnds(result).durationType).toBe(DurationType.Forever);
    expect(result.current.row).toBe('Never');
    expect(result.current.pickers.state.choiceSheet).toBeUndefined();
  });

  it('After picked on a new form reads count 12 and the track After 12 payments', async () => {
    const result = await mount();
    await tapRow(result);

    await act(async () => result.current.sheet.pickType(DurationType.AfterCount));

    expect(result.current.sheet.state).toEqual({
      draft: { type: DurationType.AfterCount, count: 12, date: '2026-12-31' },
      track: 'After 12 payments',
    });
    expect(formEnds(result)).toEqual(NEVER_HELD);
  });

  it('opened on a form holding a count of 5 lights After at 5', async () => {
    const result = await mount({ durationType: DurationType.AfterCount, endAfterCount: 5 });

    await tapRow(result);

    expect(result.current.sheet.state).toEqual({
      draft: { type: DurationType.AfterCount, count: 5, date: '2026-12-31' },
      track: 'After 5 payments',
    });
  });

  it('a step to 0 from 1 holds 1, and a step to 2 reads After 2 payments', async () => {
    const result = await mount({ durationType: DurationType.AfterCount, endAfterCount: 1 });
    await tapRow(result);

    await act(async () => result.current.sheet.setCount(0));
    expect(result.current.sheet.state.draft?.count).toBe(1);

    await act(async () => result.current.sheet.setCount(2));
    expect(result.current.sheet.state.draft?.count).toBe(2);
    expect(result.current.sheet.state.track).toBe('After 2 payments');
  });

  it('On a date picked on a new form reads 31 December of the Starts year', async () => {
    const result = await mount();
    await tapRow(result);

    await act(async () => result.current.sheet.pickType(DurationType.UntilDate));

    expect(result.current.sheet.state).toEqual({
      draft: { type: DurationType.UntilDate, count: 12, date: '2026-12-31' },
      track: 'Until Thu 31 Dec 2026',
    });
  });

  it('opened on a stored day earlier than Starts reads the Starts day, the row keeping the stored day', async () => {
    const result = await mount({ durationType: DurationType.UntilDate, endDate: '2026-10-19' });

    await tapRow(result);

    expect(result.current.sheet.state).toEqual({
      draft: { type: DurationType.UntilDate, count: 12, date: STARTS },
      track: 'Until Tue 20 Oct 2026',
    });
    expect(result.current.row).toBe('Until Mon 19 Oct 2026');
  });

  it('Done on After 3 writes after_count and 3, the row reads After 3 payments, and the sheet closes', async () => {
    const result = await mount();
    await tapRow(result);
    await stageAfterThree(result);

    await act(async () => result.current.sheet.done());

    expect(formEnds(result)).toEqual({
      durationType: DurationType.AfterCount,
      endAfterCount: 3,
      endDate: undefined,
    });
    expect(result.current.row).toBe('After 3 payments');
    expect(result.current.pickers.state.choiceSheet).toBeUndefined();
  });

  it('Done on a picked day writes until_date and that day, and the row reads Until that day', async () => {
    const result = await mount();
    await tapRow(result);
    await act(async () => result.current.sheet.pickType(DurationType.UntilDate));

    await act(async () => result.current.sheet.setDate('2027-03-15'));
    expect(result.current.sheet.state.track).toBe('Until Mon 15 Mar 2027');
    await act(async () => result.current.sheet.done());

    expect(formEnds(result)).toEqual({
      durationType: DurationType.UntilDate,
      endAfterCount: undefined,
      endDate: '2027-03-15',
    });
    expect(result.current.row).toBe('Until Mon 15 Mar 2027');
    expect(result.current.pickers.state.choiceSheet).toBeUndefined();
  });

  it('a close without Done leaves the form and the row at Never, and the next open re-seeds from the form', async () => {
    const result = await mount();
    await tapRow(result);
    await stageAfterThree(result);

    await closeWithoutDone(result);

    expect(formEnds(result)).toEqual(NEVER_HELD);
    expect(result.current.row).toBe('Never');

    await tapRow(result);

    expect(result.current.sheet.state).toEqual({
      draft: { type: DurationType.Forever, count: 12, date: '2026-12-31' },
      track: 'Never',
    });
  });

  it('Done after the close writes nothing', async () => {
    const result = await mount();
    await tapRow(result);
    await stageAfterThree(result);
    await closeWithoutDone(result);

    await act(async () => result.current.sheet.done());

    expect(formEnds(result)).toEqual(NEVER_HELD);
    expect(result.current.row).toBe('Never');
    expect(result.current.pickers.state.choiceSheet).toBeUndefined();
  });

  it('two owners never share a draft', async () => {
    const first = await mount({ durationType: DurationType.AfterCount, endAfterCount: 5 });
    const second = await mount();

    await tapRow(first);
    expect(first.current.sheet.state.draft?.count).toBe(5);
    expect(second.current.sheet.state.draft).toBeUndefined();

    await tapRow(second);
    await act(async () => first.current.sheet.setCount(7));

    expect(first.current.sheet.state.draft?.count).toBe(7);
    expect(second.current.sheet.state.draft).toEqual({
      type: DurationType.Forever,
      count: 12,
      date: '2026-12-31',
    });

    await act(async () => second.current.sheet.done());

    expect(formEnds(first)).toEqual({
      durationType: DurationType.AfterCount,
      endAfterCount: 5,
      endDate: undefined,
    });
    expect(first.current.pickers.state.choiceSheet).toBe('ends');
    expect(second.current.pickers.state.choiceSheet).toBeUndefined();
  });
});
