import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.state';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state';

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

describe('useEditCommitmentState', () => {
  it('starts with saving false, no error, and deactivateDialogVisible false', () => {
    const s = useEditCommitmentState.getState();
    expect(s.saving).toBe(false);
    expect(s.saveError).toBeUndefined();
    expect(s.deactivateDialogVisible).toBe(false);
  });

  it('setSaving updates saving', () => {
    useEditCommitmentState.getState().setSaving(true);
    expect(useEditCommitmentState.getState().saving).toBe(true);
  });

  it('setDeactivateDialogVisible updates deactivateDialogVisible', () => {
    useEditCommitmentState.getState().setDeactivateDialogVisible(true);
    expect(useEditCommitmentState.getState().deactivateDialogVisible).toBe(true);
  });

  it('setSaveError updates the visible save error', () => {
    useEditCommitmentState.getState().setSaveError('Could not save');
    expect(useEditCommitmentState.getState().saveError).toBe('Could not save');
  });

  it('reset returns to initial state', () => {
    useEditCommitmentState.getState().setSaving(true);
    useEditCommitmentState.getState().setSaveError('Could not save');
    useEditCommitmentState.getState().reset();
    expect(useEditCommitmentState.getState().saving).toBe(false);
    expect(useEditCommitmentState.getState().saveError).toBeUndefined();
  });
});
