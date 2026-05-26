import { act, renderHook } from '@testing-library/react-native';

import { useConfirmAction } from '@/utils/use_confirm_action.hook';

describe('useConfirmAction', () => {
  it('starts with no pending payload and not busy', () => {
    const { result } = renderHook(() => useConfirmAction<string>(jest.fn()));
    expect(result.current.pendingPayload).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('request() sets pendingPayload', () => {
    const { result } = renderHook(() => useConfirmAction<string>(jest.fn()));
    act(() => {
      result.current.request('tx-42');
    });
    expect(result.current.pendingPayload).toBe('tx-42');
  });

  it('cancel() clears pendingPayload without calling action', () => {
    const action = jest.fn();
    const { result } = renderHook(() => useConfirmAction<string>(action));
    act(() => {
      result.current.request('tx-42');
    });
    act(() => {
      result.current.cancel();
    });
    expect(result.current.pendingPayload).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it('confirm() calls action with pendingPayload exactly once, then clears pending', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmAction<string>(action));
    act(() => {
      result.current.request('tx-42');
    });
    await act(async () => {
      await result.current.confirm();
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith('tx-42');
    expect(result.current.pendingPayload).toBeNull();
  });

  it('confirm() sets busy=true during action, busy=false after', async () => {
    let resolveFn!: () => void;
    const action = jest.fn(
      () =>
        new Promise<void>((res) => {
          resolveFn = res;
        }),
    );
    const { result } = renderHook(() => useConfirmAction<string>(action));
    act(() => {
      result.current.request('tx-99');
    });

    // Start confirm — do not await yet
    let confirmPromise: Promise<void>;
    act(() => {
      confirmPromise = result.current.confirm();
    });
    expect(result.current.busy).toBe(true);

    // Resolve the async action
    await act(async () => {
      resolveFn();
      await confirmPromise;
    });
    expect(result.current.busy).toBe(false);
  });

  it('confirm() while already busy does NOT invoke action a second time', async () => {
    let resolveFn!: () => void;
    const action = jest.fn(
      () =>
        new Promise<void>((res) => {
          resolveFn = res;
        }),
    );
    const { result } = renderHook(() => useConfirmAction<string>(action));
    act(() => {
      result.current.request('tx-1');
    });

    let p1: Promise<void>;
    act(() => {
      p1 = result.current.confirm();
    });

    // Second confirm while busy — must be a no-op
    act(() => {
      void result.current.confirm();
    });

    await act(async () => {
      resolveFn();
      await p1;
    });

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('confirm() when action rejects still clears busy and clears pending', async () => {
    const action = jest.fn().mockRejectedValue(new Error('db error'));
    const { result } = renderHook(() => useConfirmAction<string>(action));
    act(() => {
      result.current.request('tx-bad');
    });

    await act(async () => {
      try {
        await result.current.confirm();
      } catch {
        /* expected */
      }
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.pendingPayload).toBeNull();
  });

  it('confirm() is a no-op when pendingPayload is null', async () => {
    const action = jest.fn();
    const { result } = renderHook(() => useConfirmAction<string>(action));
    // No request() called — pendingPayload is null
    await act(async () => {
      await result.current.confirm();
    });
    expect(action).not.toHaveBeenCalled();
  });
});
