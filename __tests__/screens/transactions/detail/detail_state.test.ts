import { useTxDetailState } from '@/modules/transactions/screens/transactions/detail/detail.state';

beforeEach(() => {
  useTxDetailState().reset();
});

describe('useTxDetailState initial state', () => {
  it('starts hidden, not deleting, reloadKey = 0', () => {
    const { state } = useTxDetailState();
    expect(state.confirmVisible.value).toBe(false);
    expect(state.deleting.value).toBe(false);
    expect(state.reloadKey.value).toBe(0);
  });
});

describe('useTxDetailState setters', () => {
  it('setConfirmVisible toggles the confirm dialog', () => {
    useTxDetailState().setConfirmVisible(true);
    expect(useTxDetailState().state.confirmVisible.value).toBe(true);
    useTxDetailState().setConfirmVisible(false);
    expect(useTxDetailState().state.confirmVisible.value).toBe(false);
  });

  it('setDeleting toggles the deleting flag', () => {
    useTxDetailState().setDeleting(true);
    expect(useTxDetailState().state.deleting.value).toBe(true);
    useTxDetailState().setDeleting(false);
    expect(useTxDetailState().state.deleting.value).toBe(false);
  });

  it('bumpReload increments reloadKey by 1 each call', () => {
    useTxDetailState().bumpReload();
    expect(useTxDetailState().state.reloadKey.value).toBe(1);
    useTxDetailState().bumpReload();
    expect(useTxDetailState().state.reloadKey.value).toBe(2);
  });
});

describe('useTxDetailState reset', () => {
  it('returns every field to its initial value', () => {
    useTxDetailState().setConfirmVisible(true);
    useTxDetailState().setDeleting(true);
    useTxDetailState().bumpReload();
    useTxDetailState().reset();
    const { state } = useTxDetailState();
    expect(state.confirmVisible.value).toBe(false);
    expect(state.deleting.value).toBe(false);
    expect(state.reloadKey.value).toBe(0);
  });
});
