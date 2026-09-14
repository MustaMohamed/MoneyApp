import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.state';
import {
  INITIAL_UI_ENTRY,
  useEditCommitmentState,
} from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state';

beforeEach(() => {
  useAddCommitmentState.getState().reset();
  useEditCommitmentState.getState().reset();
});

describe('useAddCommitmentState', () => {
  it('starts with saving false', () => {
    expect(useAddCommitmentState.getState().saving).toBe(false);
  });

  it('setSaving updates saving', () => {
    useAddCommitmentState.getState().setSaving(true);
    expect(useAddCommitmentState.getState().saving).toBe(true);
  });

  it('reset returns to initial state', () => {
    useAddCommitmentState.getState().setSaving(true);
    useAddCommitmentState.getState().reset();
    expect(useAddCommitmentState.getState().saving).toBe(false);
  });
});

const entryOf = (owner: string) => useEditCommitmentState.getState().entries[owner];

// Every write except `claim`, the begin action; each must refuse an owner with no entry.
const guardedWrites: ((owner: string) => void)[] = [
  (owner) => useEditCommitmentState.getState().setSaving(owner, true),
  (owner) => useEditCommitmentState.getState().setSaveError(owner, 'Could not save'),
  (owner) => useEditCommitmentState.getState().setDeactivateDialogVisible(owner, true),
];

describe('useEditCommitmentState', () => {
  it('starts with no copy owning anything', () => {
    expect(useEditCommitmentState.getState().entries).toEqual({});
  });

  it('claim opens a copy entry at its initial values', () => {
    useEditCommitmentState.getState().claim('owner-a');

    expect(entryOf('owner-a')).toEqual({
      saving: false,
      saveError: undefined,
      deactivateDialogVisible: false,
    });
  });

  it('claim on a copy that already owns an entry keeps it', () => {
    useEditCommitmentState.getState().claim('owner-a');
    useEditCommitmentState.getState().setSaveError('owner-a', 'Could not save');
    const before = entryOf('owner-a');

    useEditCommitmentState.getState().claim('owner-a');

    expect(entryOf('owner-a')).toBe(before);
  });

  it('each write on a second copy leaves the first copy entry untouched', () => {
    useEditCommitmentState.getState().claim('owner-a');
    useEditCommitmentState.getState().claim('owner-b');
    const before = entryOf('owner-a');

    for (const write of guardedWrites) {
      write('owner-b');
      expect(entryOf('owner-a')).toBe(before);
    }
    expect(entryOf('owner-b')).toEqual({
      saving: true,
      saveError: 'Could not save',
      deactivateDialogVisible: true,
    });
  });

  it('every write on a copy that never claimed writes nothing', () => {
    useEditCommitmentState.getState().claim('owner-a');
    const before = useEditCommitmentState.getState().entries;

    for (const write of guardedWrites) {
      write('owner-b');
      expect(useEditCommitmentState.getState().entries).toBe(before);
    }
  });

  it('every write after release does not resurrect the copy', () => {
    useEditCommitmentState.getState().claim('owner-a');
    useEditCommitmentState.getState().release('owner-a');
    const before = useEditCommitmentState.getState().entries;

    for (const write of guardedWrites) {
      write('owner-a');
      expect(useEditCommitmentState.getState().entries).toBe(before);
    }
    expect(useEditCommitmentState.getState().entries).toEqual({});
  });

  it('claim after release opens the copy again, from the initial entry', () => {
    useEditCommitmentState.getState().claim('owner-a');
    useEditCommitmentState.getState().setSaving('owner-a', true);
    useEditCommitmentState.getState().release('owner-a');

    useEditCommitmentState.getState().claim('owner-a');

    expect(entryOf('owner-a')).toEqual(INITIAL_UI_ENTRY);
  });

  it('release removes only the released copy', () => {
    useEditCommitmentState.getState().claim('owner-a');
    useEditCommitmentState.getState().claim('owner-b');
    const before = entryOf('owner-a');

    useEditCommitmentState.getState().release('owner-b');

    expect(entryOf('owner-a')).toBe(before);
    expect(Object.keys(useEditCommitmentState.getState().entries)).toEqual(['owner-a']);
  });

  it('reset drops every copy', () => {
    useEditCommitmentState.getState().claim('owner-a');
    useEditCommitmentState.getState().claim('owner-b');

    useEditCommitmentState.getState().reset();

    expect(useEditCommitmentState.getState().entries).toEqual({});
  });
});
