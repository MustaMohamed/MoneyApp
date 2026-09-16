import {
  INITIAL_UI_ENTRY,
  useEditAccountState,
} from '@/modules/accounts/screens/accounts/edit_account/edit_account.state';

const entryOf = (owner: string) => useEditAccountState.getState().entries[owner];

// Every write except `claim`, the begin action; each must refuse an owner with no entry.
const guardedWrites: ((owner: string) => void)[] = [
  (owner) => useEditAccountState.getState().setSaving(owner, true),
  (owner) => useEditAccountState.getState().setSaveError(owner, 'Could not save'),
];

beforeEach(() => {
  useEditAccountState.getState().reset();
});

describe('useEditAccountState', () => {
  it('starts with no copy owning anything', () => {
    expect(useEditAccountState.getState().entries).toEqual({});
  });

  it('claim opens a copy entry at its initial values', () => {
    useEditAccountState.getState().claim('owner-a');

    expect(entryOf('owner-a')).toEqual({ saving: false, saveError: undefined });
    expect(Object.isFrozen(INITIAL_UI_ENTRY)).toBe(true);
  });

  it('claim on a copy that already owns an entry keeps it', () => {
    useEditAccountState.getState().claim('owner-a');
    useEditAccountState.getState().setSaveError('owner-a', 'Could not save');
    const before = entryOf('owner-a');

    useEditAccountState.getState().claim('owner-a');

    expect(entryOf('owner-a')).toBe(before);
  });

  it('each write on a second copy leaves the first copy entry untouched', () => {
    useEditAccountState.getState().claim('owner-a');
    useEditAccountState.getState().claim('owner-b');
    const before = entryOf('owner-a');

    for (const write of guardedWrites) {
      write('owner-b');
      expect(entryOf('owner-a')).toBe(before);
    }
    expect(entryOf('owner-b')).toEqual({ saving: true, saveError: 'Could not save' });
  });

  it('every write after release leaves the entries unchanged', () => {
    useEditAccountState.getState().claim('owner-a');
    useEditAccountState.getState().release('owner-a');
    const before = useEditAccountState.getState().entries;

    for (const write of guardedWrites) {
      write('owner-a');
      expect(useEditAccountState.getState().entries).toBe(before);
    }
    expect(useEditAccountState.getState().entries).toEqual({});
  });

  it('release removes only the released copy', () => {
    useEditAccountState.getState().claim('owner-a');
    useEditAccountState.getState().claim('owner-b');
    const before = entryOf('owner-a');

    useEditAccountState.getState().release('owner-b');

    expect(entryOf('owner-a')).toBe(before);
    expect(Object.keys(useEditAccountState.getState().entries)).toEqual(['owner-a']);
  });

  it('reset empties every entry', () => {
    useEditAccountState.getState().claim('owner-a');
    useEditAccountState.getState().claim('owner-b');

    useEditAccountState.getState().reset();

    expect(useEditAccountState.getState().entries).toEqual({});
  });
});
