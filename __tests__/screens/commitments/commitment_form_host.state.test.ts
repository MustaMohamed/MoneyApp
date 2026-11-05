import { NO_STOP_COUNTS } from '@/modules/commitments/domain/payment_state';
import { NO_SETTLED_DUE_DATES } from '@/modules/commitments/screens/commitments/commitment_form.helpers';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.state';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/edit_commitment.state';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { useCommitmentStopState } from '@/modules/commitments/store/commitment_stop.state';
import { makeTestCommitment } from '@/test_helpers/commitment';

const host = () => useCommitmentFormHostState.getState();

const rent = makeTestCommitment({ id: 'c-1' });
const gym = makeTestCommitment({ id: 'c-2' });

describe('useCommitmentFormHostState', () => {
  beforeEach(() => {
    host().reset();
    useAddCommitmentState.getState().reset();
    useEditCommitmentState.getState().reset();
    useCommitmentStopState.getState().reset();
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
    const onStopped = jest.fn();
    const landing = { onSaved, onStopped };

    function closeCurrent(): void {
      host().requestClose();
      host().completeClose(host().sessionId);
    }

    it('opens an edit from closed as the next session, in edit mode with the commitment and the landing', () => {
      host().openAdd();
      closeCurrent();

      host().openEdit(rent, NO_SETTLED_DUE_DATES, landing, NO_STOP_COUNTS);

      expect(host()).toMatchObject({
        phase: 'open',
        sessionId: 2,
        mode: 'edit',
        editingCommitment: rent,
      });
      expect(host().landing).toBe(landing);
      expect(host().footer).toEqual({ saving: false });
    });

    it('opens an edit with no landing', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);

      expect(host()).toMatchObject({
        phase: 'open',
        sessionId: 1,
        mode: 'edit',
        editingCommitment: rent,
      });
      expect(host().landing).toBeUndefined();
    });

    describe('the settled due dates (MA-280)', () => {
      it('holds none while closed', () => {
        expect(host().editingSettledDueDates).toEqual([]);
      });

      it('holds the settled due dates an edit opens with', () => {
        host().openEdit(rent, ['2026-09-20'], landing, NO_STOP_COUNTS);

        expect(host().editingSettledDueDates).toEqual(['2026-09-20']);
      });

      it('holds none for an edit opened with no settled due dates', () => {
        host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);

        expect(host().editingSettledDueDates).toEqual([]);
      });

      it('holds none for an add opened after an edit with settled due dates', () => {
        host().openEdit(rent, ['2026-09-20'], landing, NO_STOP_COUNTS);
        closeCurrent();

        host().openAdd();

        expect(host().editingSettledDueDates).toEqual([]);
      });

      it('holds none once an edit with settled due dates closes', () => {
        host().openEdit(rent, ['2026-09-20'], landing, NO_STOP_COUNTS);
        expect(host().editingSettledDueDates).toEqual(['2026-09-20']);

        closeCurrent();

        expect(host().phase).toBe('closed');
        expect(host().editingSettledDueDates).toEqual([]);
      });
    });

    describe('the stop counts (MA-224)', () => {
      it('holds the stop counts an edit opens with', () => {
        host().openEdit(rent, NO_SETTLED_DUE_DATES, landing, { unpaid: 3, paid: 9 });

        expect(host().editingStopCounts).toEqual({ unpaid: 3, paid: 9 });
      });

      it('holds the empty counts for an edit opened with none', () => {
        host().openEdit(rent, NO_SETTLED_DUE_DATES, landing, NO_STOP_COUNTS);

        expect(host().editingStopCounts).toEqual({ unpaid: 0, paid: 0 });
        expect(host().editingStopCounts).toBe(NO_STOP_COUNTS);
      });

      it('holds the empty counts once an edit with stop counts closes', () => {
        host().openEdit(rent, NO_SETTLED_DUE_DATES, landing, { unpaid: 3, paid: 9 });

        closeCurrent();

        expect(host().phase).toBe('closed');
        expect(host().editingStopCounts).toEqual({ unpaid: 0, paid: 0 });
      });
    });

    it('changes nothing on openEdit while an edit is open', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, landing, NO_STOP_COUNTS);

      host().openEdit(gym, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);

      expect(host()).toMatchObject({
        phase: 'open',
        sessionId: 1,
        mode: 'edit',
        editingCommitment: rent,
      });
      expect(host().landing).toBe(landing);
    });

    it('changes nothing on openEdit while an add is open', () => {
      host().openAdd();

      host().openEdit(rent, NO_SETTLED_DUE_DATES, landing, NO_STOP_COUNTS);

      expect(host()).toMatchObject({ phase: 'open', sessionId: 1, mode: 'add' });
      expect(host().editingCommitment).toBeUndefined();
      expect(host().landing).toBeUndefined();
    });

    it('changes nothing on openEdit while closing', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, landing, NO_STOP_COUNTS);
      host().requestClose();

      host().openEdit(gym, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);

      expect(host()).toMatchObject({
        phase: 'closing',
        sessionId: 1,
        mode: 'edit',
        editingCommitment: rent,
      });
      expect(host().landing).toBe(landing);
    });

    it('opens an add after an edit with the edit commitment and landing cleared', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, landing, NO_STOP_COUNTS);
      closeCurrent();

      host().openAdd();

      expect(host()).toMatchObject({ phase: 'open', sessionId: 2, mode: 'add' });
      expect(host().editingCommitment).toBeUndefined();
      expect(host().landing).toBeUndefined();
      expect(host().footer).toEqual({ saving: false });
    });

    it('refuses a close while an edit entry saves, and closes once it lands', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);
      useEditCommitmentState.getState().claim('owner-1');
      useEditCommitmentState.getState().setSaving('owner-1', true);

      expect(host().requestClose()).toBe(false);
      expect(host().phase).toBe('open');

      useEditCommitmentState.getState().setSaving('owner-1', false);

      expect(host().requestClose()).toBe(true);
      expect(host().phase).toBe('closing');
    });

    it('refuses a close while an edit Stop writes, and closes once it lands (MA-224)', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);
      useCommitmentStopState.getState().begin('owner-1');

      expect(host().requestClose()).toBe(false);
      expect(host().phase).toBe('open');

      useCommitmentStopState.getState().succeed('owner-1');

      expect(host().requestClose()).toBe(true);
      expect(host().phase).toBe('closing');
    });

    it('refuses a close while the published footer saves', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);
      host().publishFooter(1, { saving: true });

      expect(host().requestClose()).toBe(false);
      expect(host().phase).toBe('open');

      host().publishFooter(1, { saving: false });

      expect(host().requestClose()).toBe(true);
      expect(host().phase).toBe('closing');
    });

    it('writes a published footer for the current session only', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);
      closeCurrent();
      host().openEdit(gym, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);

      host().publishFooter(1, { saving: true, errorMessage: 'stale' });
      expect(host().footer).toEqual({ saving: false });

      host().publishFooter(2, { saving: false, errorMessage: 'Save failed' });
      expect(host().footer).toEqual({ saving: false, errorMessage: 'Save failed' });
    });

    it('writes no published footer while closed', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);
      closeCurrent();

      host().publishFooter(1, { saving: true, errorMessage: 'late' });

      expect(host().phase).toBe('closed');
      expect(host().footer).toEqual({ saving: false });
    });

    it('keeps the landing through a completed save', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, landing, NO_STOP_COUNTS);

      expect(host().completeSave(1)).toBe(true);

      expect(host().phase).toBe('closing');
      expect(host().landing).toBe(landing);
    });

    it('clears the mode, the commitment, the landing and the footer on close, keeping the session id', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, landing, NO_STOP_COUNTS);
      host().publishFooter(1, { saving: false, errorMessage: 'Save failed' });
      host().requestClose();

      host().completeClose(1);

      expect(host().phase).toBe('closed');
      expect(host().sessionId).toBe(1);
      expect(host().mode).toBeUndefined();
      expect(host().editingCommitment).toBeUndefined();
      expect(host().landing).toBeUndefined();
      expect(host().footer).toEqual({ saving: false });
    });
  });

  describe('the post-close toast mark (MA-256)', () => {
    it.each(['added', 'updated'] as const)(
      'returns the %s mark once, and none after a plain close',
      (mark) => {
        host().openAdd();
        host().requestClose();
        expect(host().completeClose(1)).toBeUndefined();

        host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS);
        expect(host().completeSave(2, mark)).toBe(true);

        expect(host().completeClose(2)).toBe(mark);
        expect(host().completeClose(2)).toBeUndefined();
      },
    );

    it('returns the stopped mark once from an edit closed by a Stop, and drops its counts', () => {
      host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, { unpaid: 1, paid: 0 });
      expect(host().completeSave(1, 'stopped')).toBe(true);

      expect(host().completeClose(1)).toBe('stopped');
      expect(host().completeClose(1)).toBeUndefined();
      expect(host().editingStopCounts).toEqual({ unpaid: 0, paid: 0 });
    });

    it('takes no mark from a refused save, answers a stale session with none, and keeps it for its own', () => {
      host().openAdd();
      expect(host().completeSave(0, 'updated')).toBe(false);
      expect(host().completeSave(1, 'added')).toBe(true);

      expect(host().completeClose(0)).toBeUndefined();
      expect(host().phase).toBe('closing');

      expect(host().completeClose(1)).toBe('added');
    });
  });
});
