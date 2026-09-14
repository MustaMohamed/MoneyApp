import {
  INITIAL_PAY_SHEET_ENTRY,
  usePaySheetState,
} from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentDetailState } from '@/modules/commitments/screens/commitments/detail/detail.state';

beforeEach(() => {
  useCommitmentDetailState.getState().reset();
  usePaySheetState.getState().reset();
});

const entryOf = (owner: string) => useCommitmentDetailState.getState().entries[owner];

describe('useCommitmentDetailState', () => {
  it('starts with no copy owning anything', () => {
    expect(useCommitmentDetailState.getState().entries).toEqual({});
  });

  it('setViewState opens a copy entry with its confirm sheet closed', () => {
    useCommitmentDetailState.getState().setViewState('owner-a', 'ready');

    expect(entryOf('owner-a')).toEqual({ viewState: 'ready', skipConfirmVisible: false });
  });

  it('a second copy opening its skip confirm leaves the first copy closed', () => {
    useCommitmentDetailState.getState().setViewState('owner-a', 'ready');
    useCommitmentDetailState.getState().setViewState('owner-b', 'ready');
    const before = entryOf('owner-a');

    useCommitmentDetailState.getState().setSkipConfirmVisible('owner-b', true);

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-b').skipConfirmVisible).toBe(true);
  });

  it('a second copy resolving not-found leaves the first copy ready', () => {
    useCommitmentDetailState.getState().setViewState('owner-a', 'ready');
    useCommitmentDetailState.getState().setViewState('owner-b', 'ready');
    const before = entryOf('owner-a');

    useCommitmentDetailState.getState().setViewState('owner-b', 'notFound');

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-b').viewState).toBe('notFound');
  });

  it('setSkipConfirmVisible on a copy that never loaded writes nothing', () => {
    useCommitmentDetailState.getState().setViewState('owner-a', 'ready');
    const before = useCommitmentDetailState.getState().entries;

    useCommitmentDetailState.getState().setSkipConfirmVisible('owner-b', true);

    expect(useCommitmentDetailState.getState().entries).toBe(before);
  });

  it('setSkipConfirmVisible after release does not resurrect the copy', () => {
    useCommitmentDetailState.getState().setViewState('owner-a', 'ready');
    useCommitmentDetailState.getState().release('owner-a');
    const before = useCommitmentDetailState.getState().entries;

    useCommitmentDetailState.getState().setSkipConfirmVisible('owner-a', false);

    expect(useCommitmentDetailState.getState().entries).toBe(before);
    expect(useCommitmentDetailState.getState().entries).toEqual({});
  });

  it('setViewState after release opens the copy again, from the initial entry', () => {
    useCommitmentDetailState.getState().setViewState('owner-a', 'ready');
    useCommitmentDetailState.getState().setSkipConfirmVisible('owner-a', true);
    useCommitmentDetailState.getState().release('owner-a');

    useCommitmentDetailState.getState().setViewState('owner-a', 'loading');

    expect(entryOf('owner-a')).toEqual({ viewState: 'loading', skipConfirmVisible: false });
  });

  it('release removes only the released copy', () => {
    useCommitmentDetailState.getState().setViewState('owner-a', 'ready');
    useCommitmentDetailState.getState().setViewState('owner-b', 'loading');
    const before = entryOf('owner-a');

    useCommitmentDetailState.getState().release('owner-b');

    expect(entryOf('owner-a')).toBe(before);
    expect(Object.keys(useCommitmentDetailState.getState().entries)).toEqual(['owner-a']);
  });

  it('reset drops every copy', () => {
    useCommitmentDetailState.getState().setViewState('owner-a', 'ready');

    useCommitmentDetailState.getState().reset();

    expect(useCommitmentDetailState.getState().entries).toEqual({});
  });
});

const sheetOf = (owner: string) => usePaySheetState.getState().entries[owner];

// Every write except `open`, the begin action; each must refuse an owner with no entry.
const guardedWrites: ((owner: string) => void)[] = [
  (owner) => usePaySheetState.getState().setVisible(owner, true),
  (owner) => usePaySheetState.getState().setSaving(owner, true),
  (owner) => usePaySheetState.getState().setAccountPickerVisible(owner, true),
  (owner) => usePaySheetState.getState().setRateOverride(owner, true),
  (owner) => usePaySheetState.getState().setSaveError(owner, 'failed'),
  (owner) => usePaySheetState.getState().resetEntry(owner),
];

describe('usePaySheetState', () => {
  it('starts with no copy owning a sheet', () => {
    expect(usePaySheetState.getState().entries).toEqual({});
  });

  it('open creates a copy entry with only its sheet visible', () => {
    usePaySheetState.getState().open('owner-a');

    expect(sheetOf('owner-a')).toEqual({ ...INITIAL_PAY_SHEET_ENTRY, visible: true });
  });

  it('a second copy saving leaves the first copy entry untouched', () => {
    usePaySheetState.getState().open('owner-a');
    usePaySheetState.getState().open('owner-b');
    const before = sheetOf('owner-a');

    usePaySheetState.getState().setSaving('owner-b', true);

    expect(sheetOf('owner-a')).toBe(before);
    expect(sheetOf('owner-b').saving).toBe(true);
  });

  it('every write on a copy that never opened its sheet writes nothing', () => {
    usePaySheetState.getState().open('owner-a');
    const before = usePaySheetState.getState().entries;

    for (const write of guardedWrites) {
      write('owner-b');
      expect(usePaySheetState.getState().entries).toBe(before);
    }
  });

  it('every write after release does not resurrect the copy', () => {
    usePaySheetState.getState().open('owner-a');
    usePaySheetState.getState().release('owner-a');
    const before = usePaySheetState.getState().entries;

    for (const write of guardedWrites) {
      write('owner-a');
      expect(usePaySheetState.getState().entries).toBe(before);
    }
    expect(usePaySheetState.getState().entries).toEqual({});
  });

  it('resetEntry closes one copy and leaves the other copy error in place', () => {
    usePaySheetState.getState().open('owner-a');
    usePaySheetState.getState().setRateOverride('owner-a', true);
    usePaySheetState.getState().open('owner-b');
    usePaySheetState.getState().setSaveError('owner-b', 'failed');
    const before = sheetOf('owner-b');

    usePaySheetState.getState().resetEntry('owner-a');

    expect(sheetOf('owner-a')).toEqual(INITIAL_PAY_SHEET_ENTRY);
    expect(sheetOf('owner-b')).toBe(before);
    expect(sheetOf('owner-b').saveError).toBe('failed');
  });

  it('release removes only the released copy', () => {
    usePaySheetState.getState().open('owner-a');
    usePaySheetState.getState().open('owner-b');
    const before = sheetOf('owner-a');

    usePaySheetState.getState().release('owner-b');

    expect(sheetOf('owner-a')).toBe(before);
    expect(Object.keys(usePaySheetState.getState().entries)).toEqual(['owner-a']);
  });

  it('reset drops every copy', () => {
    usePaySheetState.getState().open('owner-a');
    usePaySheetState.getState().open('owner-b');

    usePaySheetState.getState().reset();

    expect(usePaySheetState.getState().entries).toEqual({});
  });
});
