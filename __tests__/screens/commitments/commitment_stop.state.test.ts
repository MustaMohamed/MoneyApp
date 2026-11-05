import {
  INITIAL_STOP_ENTRY,
  isAnyCommitmentStopBusy,
  useCommitmentStopState,
} from '@/modules/commitments/store/commitment_stop.state';

beforeEach(() => {
  useCommitmentStopState.getState().reset();
});

const store = () => useCommitmentStopState.getState();
const entryOf = (owner: string) => store().entries[owner];

// Every write but the two begin actions, `open` and `begin`; each must refuse an owner with no entry.
const guardedWrites: ((owner: string) => void)[] = [
  (owner) => store().cancel(owner),
  (owner) => store().fail(owner),
  (owner) => store().succeed(owner),
];

describe('useCommitmentStopState', () => {
  it('starts with no copy owning anything', () => {
    expect(store().entries).toEqual({});
  });

  it('open shows the dialog with no error, and begin marks it busy', () => {
    store().open('owner-a');
    expect(entryOf('owner-a')).toEqual({ isOpen: true, busy: false, failed: false });

    store().begin('owner-a');
    expect(entryOf('owner-a')).toEqual({ isOpen: true, busy: true, failed: false });
    expect(isAnyCommitmentStopBusy(store())).toBe(true);
  });

  it('a failed stop keeps the dialog open with its error, and open again clears it', () => {
    store().open('owner-a');
    store().begin('owner-a');
    store().fail('owner-a');
    expect(entryOf('owner-a')).toEqual({ isOpen: true, busy: false, failed: true });

    store().open('owner-a');
    expect(entryOf('owner-a')).toEqual({ isOpen: true, busy: false, failed: false });
  });

  it('a landed stop closes the dialog', () => {
    store().open('owner-a');
    store().begin('owner-a');
    store().succeed('owner-a');

    expect(entryOf('owner-a')).toEqual({ isOpen: false, busy: false, failed: false });
    expect(isAnyCommitmentStopBusy(store())).toBe(false);
  });

  it('cancel and open leave a busy stop as it is', () => {
    store().open('owner-a');
    store().begin('owner-a');
    const busy = entryOf('owner-a');

    store().cancel('owner-a');
    store().open('owner-a');

    expect(entryOf('owner-a')).toBe(busy);
  });

  it('begin on a copy with no entry opens one from the initial entry, busy', () => {
    store().begin('owner-a');

    expect(entryOf('owner-a')).toEqual({ ...INITIAL_STOP_ENTRY, busy: true });
  });

  it('each write on a second copy leaves the first copy entry untouched', () => {
    store().open('owner-a');
    store().open('owner-b');
    const before = entryOf('owner-a');

    store().begin('owner-b');
    for (const write of guardedWrites) {
      write('owner-b');
      expect(entryOf('owner-a')).toBe(before);
    }
  });

  it('every guarded write on a copy that never opened writes nothing', () => {
    store().open('owner-a');
    const before = store().entries;

    for (const write of guardedWrites) {
      write('owner-b');
      expect(store().entries).toBe(before);
    }
  });

  it('every guarded write after release does not resurrect the copy', () => {
    store().open('owner-a');
    store().begin('owner-a');
    store().release('owner-a');
    const before = store().entries;

    for (const write of guardedWrites) {
      write('owner-a');
      expect(store().entries).toBe(before);
    }
    expect(store().entries).toEqual({});
  });
});
