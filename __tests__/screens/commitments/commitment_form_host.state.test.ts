import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.state';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';

const host = () => useCommitmentFormHostState.getState();

describe('useCommitmentFormHostState', () => {
  beforeEach(() => {
    host().reset();
    useAddCommitmentState.getState().reset();
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
    expect(host().completeSave()).toBe(false);
    expect(host().phase).toBe('closed');

    host().openAdd();

    expect(host().completeSave()).toBe(true);
    expect(host().phase).toBe('closing');
  });

  it('changes nothing on openAdd or completeSave while closing', () => {
    host().openAdd();
    host().requestClose();

    host().openAdd();
    expect(host().phase).toBe('closing');
    expect(host().sessionId).toBe(1);

    expect(host().completeSave()).toBe(false);
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
});
