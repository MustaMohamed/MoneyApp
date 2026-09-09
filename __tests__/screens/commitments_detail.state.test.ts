import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
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

describe('usePaySheetState', () => {
  it('starts with all false', () => {
    const s = usePaySheetState.getState();
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
  });

  it('setVisible updates visible', () => {
    usePaySheetState.getState().setVisible(true);
    expect(usePaySheetState.getState().visible).toBe(true);
  });

  it('setSaving updates saving', () => {
    usePaySheetState.getState().setSaving(true);
    expect(usePaySheetState.getState().saving).toBe(true);
  });

  it('setAccountPickerVisible updates accountPickerVisible', () => {
    usePaySheetState.getState().setAccountPickerVisible(true);
    expect(usePaySheetState.getState().accountPickerVisible).toBe(true);
  });

  it('reset returns to initial state', () => {
    usePaySheetState.getState().setVisible(true);
    usePaySheetState.getState().reset();
    expect(usePaySheetState.getState().visible).toBe(false);
  });
});
