import {
  createAccountFormState,
  useAccountFormState,
} from '@/modules/accounts/components/account_form/account_form.state';

describe('useAccountFormState', () => {
  beforeEach(() => {
    useAccountFormState.getState().reset();
  });

  it('starts idle, uninserted, with no error', () => {
    const s = useAccountFormState.getState();
    expect(s.saving).toBe(false);
    expect(s.inserted).toBe(false);
    expect(s.errorMessage).toBeUndefined();
  });

  it('beginSave() returns true and sets saving', () => {
    expect(useAccountFormState.getState().beginSave()).toBe(true);
    expect(useAccountFormState.getState().saving).toBe(true);
  });

  it('a second beginSave() while saving returns false and does not clear errorMessage', () => {
    // Direct `setState`: the public actions cannot reach saving with a stale `errorMessage`.
    useAccountFormState.setState({ saving: true, errorMessage: 'boom' });

    expect(useAccountFormState.getState().beginSave()).toBe(false);
    expect(useAccountFormState.getState().errorMessage).toBe('boom');
    expect(useAccountFormState.getState().saving).toBe(true);
  });

  it('beginSave() clears a previous errorMessage on the first, accepted call', () => {
    useAccountFormState.getState().beginSave();
    useAccountFormState.getState().failSave('boom');
    expect(useAccountFormState.getState().errorMessage).toBe('boom');

    expect(useAccountFormState.getState().beginSave()).toBe(true);
    expect(useAccountFormState.getState().errorMessage).toBeUndefined();
  });

  it('markInserted() sets inserted and leaves saving alone', () => {
    useAccountFormState.getState().beginSave();
    useAccountFormState.getState().markInserted();
    const s = useAccountFormState.getState();
    expect(s.inserted).toBe(true);
    expect(s.saving).toBe(true);
  });

  it('beginSave() after finishSave() returns true with inserted still true — the retry latch', () => {
    useAccountFormState.getState().beginSave();
    useAccountFormState.getState().markInserted();
    useAccountFormState.getState().finishSave();

    expect(useAccountFormState.getState().beginSave()).toBe(true);
    expect(useAccountFormState.getState().inserted).toBe(true);
  });

  it('failSave(message) sets saving false and errorMessage, leaves inserted untouched', () => {
    useAccountFormState.getState().beginSave();
    useAccountFormState.getState().markInserted();
    useAccountFormState.getState().failSave('boom');

    const s = useAccountFormState.getState();
    expect(s.saving).toBe(false);
    expect(s.errorMessage).toBe('boom');
    expect(s.inserted).toBe(true);
  });

  it('reset() returns all four fields to initial', () => {
    useAccountFormState.getState().beginSave();
    useAccountFormState.getState().markInserted();
    useAccountFormState.getState().failSave('boom');

    useAccountFormState.getState().reset();

    const s = useAccountFormState.getState();
    expect(s.saving).toBe(false);
    expect(s.inserted).toBe(false);
    expect(s.completed).toBe(false);
    expect(s.errorMessage).toBeUndefined();
  });

  it('finishSave() completes the session, declineSave() does not (MA-008 D10, T4)', () => {
    useAccountFormState.getState().beginSave();
    useAccountFormState.getState().markInserted();
    useAccountFormState.getState().finishSave();
    expect(useAccountFormState.getState().completed).toBe(true);

    useAccountFormState.getState().reset();

    useAccountFormState.getState().beginSave();
    useAccountFormState.getState().markInserted();
    useAccountFormState.getState().declineSave();
    const s = useAccountFormState.getState();
    expect(s.saving).toBe(false);
    expect(s.inserted).toBe(true);
    expect(s.completed).toBe(false);
  });

  it('createAccountFormState() twice yields two independent stores', () => {
    const a = createAccountFormState();
    const b = createAccountFormState();

    a.getState().beginSave();
    a.getState().markInserted();

    expect(b.getState().saving).toBe(false);
    expect(b.getState().inserted).toBe(false);
  });
});
