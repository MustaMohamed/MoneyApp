import { useTxDetailState } from '@/screens/transactions/detail/detail.state';

beforeEach(() => {
  useTxDetailState.getState().reset();
});

describe('useTxDetailState initial state', () => {
  it('starts hidden, not deleting, reloadKey = 0', () => {
    const s = useTxDetailState.getState().state;
    expect(s.confirmVisible).toBe(false);
    expect(s.deleting).toBe(false);
    expect(s.reloadKey).toBe(0);
  });
});

describe('useTxDetailState setters', () => {
  it('setConfirmVisible toggles the confirm dialog', () => {
    useTxDetailState.getState().setConfirmVisible(true);
    expect(useTxDetailState.getState().state.confirmVisible).toBe(true);
    useTxDetailState.getState().setConfirmVisible(false);
    expect(useTxDetailState.getState().state.confirmVisible).toBe(false);
  });

  it('setDeleting toggles the deleting flag', () => {
    useTxDetailState.getState().setDeleting(true);
    expect(useTxDetailState.getState().state.deleting).toBe(true);
    useTxDetailState.getState().setDeleting(false);
    expect(useTxDetailState.getState().state.deleting).toBe(false);
  });

  it('bumpReload increments reloadKey by 1 each call', () => {
    useTxDetailState.getState().bumpReload();
    expect(useTxDetailState.getState().state.reloadKey).toBe(1);
    useTxDetailState.getState().bumpReload();
    expect(useTxDetailState.getState().state.reloadKey).toBe(2);
  });
});

describe('useTxDetailState reset', () => {
  it('returns every field to its initial value', () => {
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
