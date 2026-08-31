import { act, renderHook } from '@testing-library/react-native';

import { useConfirmAction } from '@/utils/use_confirm_action.hook';

describe('useConfirmAction', () => {
  it('starts with no pending payload and not busy', async () => {
    const { result } = await renderHook(() => useConfirmAction<string>(jest.fn()));
    expect(result.current.pendingPayload).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it('request() sets pendingPayload', async () => {
    const { result } = await renderHook(() => useConfirmAction<string>(jest.fn()));
    await act(() => {
      result.current.request('tx-42');
    });
    expect(result.current.pendingPayload).toBe('tx-42');
  });

  it('cancel() clears pendingPayload without calling action', async () => {
    const action = jest.fn();
    const { result } = await renderHook(() => useConfirmAction<string>(action));
    await act(() => {
      result.current.request('tx-42');
    });
    await act(() => {
      result.current.cancel();
    });
    expect(result.current.pendingPayload).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it('confirm() calls action with pendingPayload exactly once, then clears pending', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() => useConfirmAction<string>(action));
    await act(() => {
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
    const { result } = await renderHook(() => useConfirmAction<string>(action));
    await act(() => {
      result.current.request('tx-99');
    });

    let confirmPromise: Promise<void>;
    await act(() => {
      confirmPromise = result.current.confirm();
    });
    expect(result.current.busy).toBe(true);

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
    const { result } = await renderHook(() => useConfirmAction<string>(action));
    await act(() => {
      result.current.request('tx-1');
    });

    let p1: Promise<void>;
    await act(() => {
      p1 = result.current.confirm();
    });

    await act(() => {
      void result.current.confirm();
    });

    await act(async () => {
      resolveFn();
      await p1;
    });

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('confirm() when action rejects keeps the pending payload and exposes the error', async () => {
    const error = new Error('db error');
    const action = jest.fn().mockRejectedValue(error);
    const { result } = await renderHook(() => useConfirmAction<string>(action));
    await act(() => {
      result.current.request('tx-bad');
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.pendingPayload).toBe('tx-bad');
    expect(result.current.error).toBe(error);
  });

  it('request() and cancel() clear a previous confirmation error', async () => {
    const action = jest.fn().mockRejectedValue(new Error('db error'));
    const { result } = await renderHook(() => useConfirmAction<string>(action));
    await act(() => result.current.request('first'));
    await act(async () => result.current.confirm());

    await act(() => result.current.request('second'));
    expect(result.current.error).toBeNull();

    await act(async () => result.current.confirm());
    await act(() => result.current.cancel());
    expect(result.current.error).toBeNull();
  });

  it('confirm() is a no-op when pendingPayload is null', async () => {
    const action = jest.fn();
    const { result } = await renderHook(() => useConfirmAction<string>(action));
    await act(async () => {
      await result.current.confirm();
    });
    expect(action).not.toHaveBeenCalled();
  });
});
