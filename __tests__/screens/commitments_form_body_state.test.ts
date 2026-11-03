import { RecurrencePeriod, RecurrencePreset } from '@/constants/enums';
import type { RepeatsDraft } from '@/modules/commitments/screens/commitments/commitment_form.shared';
import {
  INITIAL_PICKER_ENTRY,
  useCommitmentFormBodyState,
} from '@/modules/commitments/screens/commitments/components/commitment_form_body.state';

beforeEach(() => {
  useCommitmentFormBodyState.getState().reset();
});

const entryOf = (owner: string) => useCommitmentFormBodyState.getState().entries[owner];

const monthlyDraft: RepeatsDraft = {
  preset: RecurrencePreset.Monthly,
  every: 1,
  period: RecurrencePeriod.Months,
};
const customDraft: RepeatsDraft = {
  preset: RecurrencePreset.Custom,
  every: 3,
  period: RecurrencePeriod.Weeks,
};

// Every write except `claim`, the begin action; each must refuse an owner with no entry.
const guardedWrites: ((owner: string) => void)[] = [
  (owner) => useCommitmentFormBodyState.getState().setCategoryPickerVisible(owner, true),
  (owner) => useCommitmentFormBodyState.getState().setShowEndDatePicker(owner, true),
  (owner) => useCommitmentFormBodyState.getState().setChoiceSheet(owner, 'ends'),
  (owner) => useCommitmentFormBodyState.getState().openRepeatsSheet(owner, monthlyDraft),
  (owner) => useCommitmentFormBodyState.getState().setRepeatsDraft(owner, customDraft),
];

describe('useCommitmentFormBodyState', () => {
  it('starts with no copy owning anything', () => {
    expect(useCommitmentFormBodyState.getState().entries).toEqual({});
  });

  it('claim opens a copy entry with every picker, date picker and choice sheet hidden, and no Repeats draft', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');

    expect(entryOf('owner-a')).toStrictEqual({
      categoryPickerVisible: false,
      showEndDatePicker: false,
      choiceSheet: undefined,
      repeatsDraft: undefined,
    });
  });

  it('openRepeatsSheet opens the Repeats sheet and holds its draft in one write (MA-276)', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');

    useCommitmentFormBodyState.getState().openRepeatsSheet('owner-a', monthlyDraft);

    expect(entryOf('owner-a')).toMatchObject({
      choiceSheet: 'repeats',
      repeatsDraft: monthlyDraft,
    });
  });

  it('setRepeatsDraft replaces the draft and keeps the sheet open (MA-276)', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');
    useCommitmentFormBodyState.getState().openRepeatsSheet('owner-a', monthlyDraft);

    useCommitmentFormBodyState.getState().setRepeatsDraft('owner-a', customDraft);

    expect(entryOf('owner-a')).toMatchObject({ choiceSheet: 'repeats', repeatsDraft: customDraft });
  });

  it('closing the choice sheet keeps the Repeats draft through the close (MA-276)', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');
    useCommitmentFormBodyState.getState().openRepeatsSheet('owner-a', customDraft);

    useCommitmentFormBodyState.getState().setChoiceSheet('owner-a', undefined);

    expect(entryOf('owner-a')).toMatchObject({ choiceSheet: undefined, repeatsDraft: customDraft });
  });

  it('claim on a copy that already owns an entry keeps it', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');
    useCommitmentFormBodyState.getState().setCategoryPickerVisible('owner-a', true);
    const before = entryOf('owner-a');

    useCommitmentFormBodyState.getState().claim('owner-a');

    expect(entryOf('owner-a')).toBe(before);
  });

  it('each write on a second copy leaves the first copy entry untouched', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');
    useCommitmentFormBodyState.getState().claim('owner-b');
    const before = entryOf('owner-a');

    for (const write of guardedWrites) {
      write('owner-b');
      expect(entryOf('owner-a')).toBe(before);
    }
    expect(entryOf('owner-b')).toStrictEqual({
      categoryPickerVisible: true,
      showEndDatePicker: true,
      choiceSheet: 'repeats',
      repeatsDraft: customDraft,
    });
  });

  it('every write on a copy that never claimed writes nothing', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');
    const before = useCommitmentFormBodyState.getState().entries;

    for (const write of guardedWrites) {
      write('owner-b');
      expect(useCommitmentFormBodyState.getState().entries).toBe(before);
    }
  });

  it('every write after release does not resurrect the copy', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');
    useCommitmentFormBodyState.getState().release('owner-a');
    const before = useCommitmentFormBodyState.getState().entries;

    for (const write of guardedWrites) {
      write('owner-a');
      expect(useCommitmentFormBodyState.getState().entries).toBe(before);
    }
    expect(useCommitmentFormBodyState.getState().entries).toEqual({});
  });

  it('claim after release opens the copy again, from the initial entry', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');
    useCommitmentFormBodyState.getState().setShowEndDatePicker('owner-a', true);
    useCommitmentFormBodyState.getState().release('owner-a');

    useCommitmentFormBodyState.getState().claim('owner-a');

    expect(entryOf('owner-a')).toEqual(INITIAL_PICKER_ENTRY);
  });

  it('release removes only the released copy', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');
    useCommitmentFormBodyState.getState().claim('owner-b');
    const before = entryOf('owner-a');

    useCommitmentFormBodyState.getState().release('owner-b');

    expect(entryOf('owner-a')).toBe(before);
    expect(Object.keys(useCommitmentFormBodyState.getState().entries)).toEqual(['owner-a']);
  });

  it('reset drops every copy', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');
    useCommitmentFormBodyState.getState().claim('owner-b');

    useCommitmentFormBodyState.getState().reset();

    expect(useCommitmentFormBodyState.getState().entries).toEqual({});
  });
});
