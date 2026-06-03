import { act, renderHook } from '@testing-library/react-native';

import { useTxDetailState } from '@/modules/transactions/screens/transactions/detail/detail.state';

function setup() {
  const hook = renderHook(() => useTxDetailState());
  act(() => hook.result.current.reset());
  return hook;
}

describe('useTxDetailState initial state', () => {
  it('starts hidden, not deleting, reloadKey = 0', () => {
    const { result } = setup();
    const { state } = result.current;

    expect(state.confirmVisible.value).toBe(false);
    expect(state.deleting.value).toBe(false);
    expect(state.reloadKey.value).toBe(0);
  });
});

describe('useTxDetailState setters', () => {
  it('setConfirmVisible toggles the confirm dialog', () => {
    const { result } = setup();

    act(() => result.current.setConfirmVisible(true));
    expect(result.current.state.confirmVisible.value).toBe(true);
    act(() => result.current.setConfirmVisible(false));
    expect(result.current.state.confirmVisible.value).toBe(false);
  });

  it('setDeleting toggles the deleting flag', () => {
    const { result } = setup();

    act(() => result.current.setDeleting(true));
    expect(result.current.state.deleting.value).toBe(true);
    act(() => result.current.setDeleting(false));
    expect(result.current.state.deleting.value).toBe(false);
  });

  it('bumpReload increments reloadKey by 1 each call', () => {
    const { result } = setup();

    act(() => result.current.bumpReload());
    expect(result.current.state.reloadKey.value).toBe(1);
    act(() => result.current.bumpReload());
    expect(result.current.state.reloadKey.value).toBe(2);
  });
});

describe('useTxDetailState reset', () => {
  it('returns every field to its initial value', () => {
    const { result } = setup();

    act(() => result.current.setConfirmVisible(true));
    act(() => result.current.setDeleting(true));
    act(() => result.current.bumpReload());
    act(() => result.current.reset());

    expect(result.current.state.confirmVisible.value).toBe(false);
    expect(result.current.state.deleting.value).toBe(false);
    expect(result.current.state.reloadKey.value).toBe(0);
  });
});
