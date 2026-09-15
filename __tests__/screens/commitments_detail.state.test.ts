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

const COLD_ENTRY = {
  status: 'loading',
  refreshError: false,
  reloadKey: 0,
  skipConfirmVisible: false,
  skipBusy: false,
  skipError: false,
};

describe('useCommitmentDetailState', () => {
  it('starts with no copy owning anything', () => {
    expect(useCommitmentDetailState.getState().entries).toEqual({});
  });

  it('beginLoad opens a copy entry with its confirm sheet closed', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', false);

    expect(entryOf('owner-a')).toEqual(COLD_ENTRY);
  });

  it('a second copy opening its skip confirm leaves the first copy closed', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', false);
    useCommitmentDetailState.getState().beginLoad('owner-b', false);
    const before = entryOf('owner-a');

    useCommitmentDetailState.getState().setSkipConfirmVisible('owner-b', true);

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-b').skipConfirmVisible).toBe(true);
  });

  it('a second copy failing its first load leaves the first copy ready', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', false);
    useCommitmentDetailState.getState().resolve('owner-a');
    useCommitmentDetailState.getState().beginLoad('owner-b', false);
    const before = entryOf('owner-a');

    useCommitmentDetailState.getState().failLoad('owner-b', false);

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-a').status).toBe('ready');
    expect(entryOf('owner-b').status).toBe('firstLoadError');
  });

  it('a warm beginLoad keeps ready and clears the refresh error', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', false);
    useCommitmentDetailState.getState().resolve('owner-a');
    useCommitmentDetailState.getState().failLoad('owner-a', true);

    useCommitmentDetailState.getState().beginLoad('owner-a', true);

    expect(entryOf('owner-a').status).toBe('ready');
    expect(entryOf('owner-a').refreshError).toBe(false);
  });

  it('a cold failLoad reads firstLoadError', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', false);

    useCommitmentDetailState.getState().failLoad('owner-a', false);

    expect(entryOf('owner-a').status).toBe('firstLoadError');
    expect(entryOf('owner-a').refreshError).toBe(false);
  });

  it('a warm failLoad keeps ready with the refresh error set', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', true);

    useCommitmentDetailState.getState().failLoad('owner-a', true);

    expect(entryOf('owner-a').status).toBe('ready');
    expect(entryOf('owner-a').refreshError).toBe(true);
  });

  it('resolve after failLoad clears the error', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', true);
    useCommitmentDetailState.getState().failLoad('owner-a', true);

    useCommitmentDetailState.getState().resolve('owner-a');

    expect(entryOf('owner-a').status).toBe('ready');
    expect(entryOf('owner-a').refreshError).toBe(false);
  });

  it('bumpReload moves only that copy reload key', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', false);
    useCommitmentDetailState.getState().beginLoad('owner-b', false);
    const before = entryOf('owner-b');

    useCommitmentDetailState.getState().bumpReload('owner-a');

    expect(entryOf('owner-a').reloadKey).toBe(1);
    expect(entryOf('owner-b')).toBe(before);
  });

  it('setSkipBusy and setSkipError write only that copy skip outcome', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', false);

    useCommitmentDetailState.getState().setSkipBusy('owner-a', true);
    useCommitmentDetailState.getState().setSkipError('owner-a', true);

    expect(entryOf('owner-a').skipBusy).toBe(true);
    expect(entryOf('owner-a').skipError).toBe(true);
  });

  it('setSkipConfirmVisible on a copy that never loaded writes nothing', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', false);
    const before = useCommitmentDetailState.getState().entries;

    useCommitmentDetailState.getState().setSkipConfirmVisible('owner-b', true);

    expect(useCommitmentDetailState.getState().entries).toBe(before);
  });

  it('every guarded write after release does not resurrect the copy', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', false);
    useCommitmentDetailState.getState().release('owner-a');
    const before = useCommitmentDetailState.getState().entries;
    const store = useCommitmentDetailState.getState();
    const guardedWrites: ((owner: string) => void)[] = [
      (owner) => store.resolve(owner),
      (owner) => store.failLoad(owner, false),
      (owner) => store.failLoad(owner, true),
      (owner) => store.bumpReload(owner),
      (owner) => store.setSkipConfirmVisible(owner, false),
      (owner) => store.setSkipBusy(owner, true),
      (owner) => store.setSkipError(owner, true),
    ];

    for (const write of guardedWrites) {
      write('owner-a');
      expect(useCommitmentDetailState.getState().entries).toBe(before);
    }
    expect(useCommitmentDetailState.getState().entries).toEqual({});
  });

  it('beginLoad after release opens the copy again, from the initial entry', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', false);
    useCommitmentDetailState.getState().setSkipConfirmVisible('owner-a', true);
    useCommitmentDetailState.getState().release('owner-a');

    useCommitmentDetailState.getState().beginLoad('owner-a', false);

    expect(entryOf('owner-a')).toEqual(COLD_ENTRY);
  });

  it('release removes only the released copy', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', true);
    useCommitmentDetailState.getState().beginLoad('owner-b', false);
    const before = entryOf('owner-a');

    useCommitmentDetailState.getState().release('owner-b');

    expect(entryOf('owner-a')).toBe(before);
    expect(Object.keys(useCommitmentDetailState.getState().entries)).toEqual(['owner-a']);
  });

  it('reset drops every copy', () => {
    useCommitmentDetailState.getState().beginLoad('owner-a', true);

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
