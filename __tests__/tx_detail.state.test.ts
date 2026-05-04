import { useTxDetailState } from '@/screens/transactions/detail/detail.state';

beforeEach(() => useTxDetailState.getState().reset());

describe('useTxDetailState', () => {
  it('starts with all flags false and reloadKey 0', () => {
    const s = useTxDetailState.getState().state;
    expect(s.confirmVisible).toBe(false);
    expect(s.deleting).toBe(false);
    expect(s.reloadKey).toBe(0);
  });

  it('setConfirmVisible toggles', () => {
    useTxDetailState.getState().setConfirmVisible(true);
    expect(useTxDetailState.getState().state.confirmVisible).toBe(true);
    useTxDetailState.getState().setConfirmVisible(false);
    expect(useTxDetailState.getState().state.confirmVisible).toBe(false);
  });

  it('setDeleting toggles', () => {
    useTxDetailState.getState().setDeleting(true);
    expect(useTxDetailState.getState().state.deleting).toBe(true);
    useTxDetailState.getState().setDeleting(false);
    expect(useTxDetailState.getState().state.deleting).toBe(false);
  });

  it('bumpReload increments reloadKey', () => {
    useTxDetailState.getState().bumpReload();
    expect(useTxDetailState.getState().state.reloadKey).toBe(1);
    useTxDetailState.getState().bumpReload();
    expect(useTxDetailState.getState().state.reloadKey).toBe(2);
  });

  it('reset returns to defaults', () => {
    useTxDetailState.getState().setConfirmVisible(true);
    useTxDetailState.getState().setDeleting(true);
    useTxDetailState.getState().bumpReload();
    useTxDetailState.getState().reset();
    const s = useTxDetailState.getState().state;
    expect(s.confirmVisible).toBe(false);
    expect(s.deleting).toBe(false);
    expect(s.reloadKey).toBe(0);
  });
});
