import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.state';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/edit_commitment.state';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';

const host = () => useCommitmentFormHostState.getState();

describe('useCommitmentFormHostState', () => {
  beforeEach(() => {
    host().reset();
    useAddCommitmentState.getState().reset();
    useEditCommitmentState.getState().reset();
  });

  it('opens the add sheet from closed as session 1', () => {
    expect(host().phase).toBe('closed');
    expect(host().sessionId).toBe(0);

    host().openAdd();

    expect(host().phase).toBe('open');
    expect(host().sessionId).toBe(1);
  });

  it('changes nothing on a second openAdd while open', () => {
    host().openAdd();

    host().openAdd();

    expect(host().phase).toBe('open');
    expect(host().sessionId).toBe(1);
  });

  it('refuses a close while the add save is in flight', () => {
    host().openAdd();
    useAddCommitmentState.getState().setSaving(true);

    expect(host().requestClose()).toBe(false);
    expect(host().phase).toBe('open');
  });

  it('starts closing on a close request with no save in flight', () => {
    host().openAdd();

    expect(host().requestClose()).toBe(true);
    expect(host().phase).toBe('closing');
  });

  it('starts closing on a completed save from open, and refuses one from closed', () => {
    expect(host().completeSave(0)).toBe(false);
    expect(host().phase).toBe('closed');

    host().openAdd();

    expect(host().completeSave(1)).toBe(true);
    expect(host().phase).toBe('closing');
  });

  it('refuses a completed save from another session and stays open', () => {
    host().openAdd();
    host().requestClose();
    host().completeClose(1);
    host().openAdd();

    expect(host().completeSave(1)).toBe(false);
    expect(host().phase).toBe('open');

    expect(host().completeSave(2)).toBe(true);
    expect(host().phase).toBe('closing');
  });

  it('changes nothing on openAdd or completeSave while closing', () => {
    host().openAdd();
    host().requestClose();

    host().openAdd();
    expect(host().phase).toBe('closing');
    expect(host().sessionId).toBe(1);

    expect(host().completeSave(1)).toBe(false);
    expect(host().phase).toBe('closing');
    expect(host().sessionId).toBe(1);
  });

  it('closes only for the current session, keeping its id', () => {
    host().openAdd();
    host().requestClose();

    host().completeClose(0);
    expect(host().phase).toBe('closing');

    host().completeClose(1);
    expect(host().phase).toBe('closed');
    expect(host().sessionId).toBe(1);
  });

  describe('edit sessions', () => {
    const onSaved = jest.fn();
    const onDeactivated = jest.fn();
    const landing = { onSaved, onDeactivated };

    function closeCurrent(): void {
      host().requestClose();
      host().completeClose(host().sessionId);
    }

    it('opens an edit from closed as the next session, in edit mode with the id and the landing', () => {
      host().openAdd();
      closeCurrent();

      host().openEdit('c-1', landing);

      expect(host()).toMatchObject({
        phase: 'open',
        sessionId: 2,
        mode: 'edit',
        editingCommitmentId: 'c-1',
      });
      expect(host().landing).toBe(landing);
      expect(host().footer).toEqual({ saving: false });
    });

    it('opens an edit with no landing', () => {
      host().openEdit('c-1');

      expect(host()).toMatchObject({
        phase: 'open',
        sessionId: 1,
        mode: 'edit',
        editingCommitmentId: 'c-1',
      });
      expect(host().landing).toBeUndefined();
    });

    it('changes nothing on openEdit while an edit is open', () => {
      host().openEdit('c-1', landing);

      host().openEdit('c-2');

      expect(host()).toMatchObject({
        phase: 'open',
        sessionId: 1,
        mode: 'edit',
        editingCommitmentId: 'c-1',
      });
      expect(host().landing).toBe(landing);
    });

    it('changes nothing on openEdit while an add is open', () => {
      host().openAdd();

      host().openEdit('c-1', landing);

      expect(host()).toMatchObject({ phase: 'open', sessionId: 1, mode: 'add' });
      expect(host().editingCommitmentId).toBeUndefined();
      expect(host().landing).toBeUndefined();
    });

    it('changes nothing on openEdit while closing', () => {
      host().openEdit('c-1', landing);
      host().requestClose();

      host().openEdit('c-2');

      expect(host()).toMatchObject({
        phase: 'closing',
        sessionId: 1,
        mode: 'edit',
        editingCommitmentId: 'c-1',
      });
      expect(host().landing).toBe(landing);
    });

    it('opens an add after an edit with the edit id and landing cleared', () => {
      host().openEdit('c-1', landing);
      closeCurrent();

      host().openAdd();

      expect(host()).toMatchObject({ phase: 'open', sessionId: 2, mode: 'add' });
      expect(host().editingCommitmentId).toBeUndefined();
      expect(host().landing).toBeUndefined();
      expect(host().footer).toEqual({ saving: false });
    });

    it('refuses a close while an edit entry saves, and closes once it lands', () => {
      host().openEdit('c-1');
      useEditCommitmentState.getState().claim('owner-1');
      useEditCommitmentState.getState().setSaving('owner-1', true);

      expect(host().requestClose()).toBe(false);
      expect(host().phase).toBe('open');

      useEditCommitmentState.getState().setSaving('owner-1', false);

      expect(host().requestClose()).toBe(true);
      expect(host().phase).toBe('closing');
    });

    it('refuses a close while the published footer saves', () => {
      host().openEdit('c-1');
      host().publishFooter(1, { saving: true });

      expect(host().requestClose()).toBe(false);
      expect(host().phase).toBe('open');

      host().publishFooter(1, { saving: false });

      expect(host().requestClose()).toBe(true);
      expect(host().phase).toBe('closing');
    });

    it('writes a published footer for the current session only', () => {
      host().openEdit('c-1');
      closeCurrent();
      host().openEdit('c-2');

      host().publishFooter(1, { saving: true, errorMessage: 'stale' });
      expect(host().footer).toEqual({ saving: false });

      host().publishFooter(2, { saving: false, errorMessage: 'Save failed' });
      expect(host().footer).toEqual({ saving: false, errorMessage: 'Save failed' });
    });

    it('writes no published footer while closed', () => {
      host().openEdit('c-1');
      closeCurrent();

      host().publishFooter(1, { saving: true, errorMessage: 'late' });

      expect(host().phase).toBe('closed');
      expect(host().footer).toEqual({ saving: false });
    });

    it('keeps the landing through a completed save', () => {
      host().openEdit('c-1', landing);

      expect(host().completeSave(1)).toBe(true);

      expect(host().phase).toBe('closing');
      expect(host().landing).toBe(landing);
    });

    it('clears the mode, the id, the landing and the footer on close, keeping the session id', () => {
      host().openEdit('c-1', landing);
      host().publishFooter(1, { saving: false, errorMessage: 'Save failed' });
      host().requestClose();

      host().completeClose(1);

      expect(host().phase).toBe('closed');
      expect(host().sessionId).toBe(1);
      expect(host().mode).toBeUndefined();
      expect(host().editingCommitmentId).toBeUndefined();
      expect(host().landing).toBeUndefined();
      expect(host().footer).toEqual({ saving: false });
    });
  });
});
