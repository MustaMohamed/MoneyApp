import {
  INITIAL_PICKER_ENTRY,
  useCommitmentFormBodyState,
} from '@/modules/commitments/screens/commitments/components/commitment_form_body.state';

beforeEach(() => {
  useCommitmentFormBodyState.getState().reset();
});

const entryOf = (owner: string) => useCommitmentFormBodyState.getState().entries[owner];

// Every write except `claim`, the begin action; each must refuse an owner with no entry.
const guardedWrites: ((owner: string) => void)[] = [
  (owner) => useCommitmentFormBodyState.getState().setCategoryPickerVisible(owner, true),
  (owner) => useCommitmentFormBodyState.getState().setAccountPickerVisible(owner, true),
  (owner) => useCommitmentFormBodyState.getState().setShowStartDatePicker(owner, true),
  (owner) => useCommitmentFormBodyState.getState().setShowEndDatePicker(owner, true),
];

describe('useCommitmentFormBodyState', () => {
  it('starts with no copy owning anything', () => {
    expect(useCommitmentFormBodyState.getState().entries).toEqual({});
  });

  it('claim opens a copy entry with every picker and date picker hidden', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');

    expect(entryOf('owner-a')).toEqual({
      categoryPickerVisible: false,
      accountPickerVisible: false,
      showStartDatePicker: false,
      showEndDatePicker: false,
    });
  });

  it('claim on a copy that already owns an entry keeps it', () => {
    useCommitmentFormBodyState.getState().claim('owner-a');
    useCommitmentFormBodyState.getState().setAccountPickerVisible('owner-a', true);
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
    expect(entryOf('owner-b')).toEqual({
      categoryPickerVisible: true,
      accountPickerVisible: true,
      showStartDatePicker: true,
      showEndDatePicker: true,
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
    useCommitmentFormBodyState.getState().setShowStartDatePicker('owner-a', true);
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
