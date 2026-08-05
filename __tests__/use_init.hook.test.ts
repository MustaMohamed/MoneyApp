import { act, renderHook } from '@testing-library/react-native';

import { useInit } from '@/utils/use_init.hook';

describe('useInit', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('runs init on mount', async () => {
    const init = jest.fn();

    await renderHook(() => useInit(init));

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('does not re-run when the hook rerenders', async () => {
    const init = jest.fn();

    const { rerender } = await renderHook(() => useInit(init));
    expect(init).toHaveBeenCalledTimes(1);

    await rerender({});

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('runs init once per mounted hook instance', async () => {
    const init = jest.fn();

    const first = await renderHook(() => useInit(init));
    await first.unmount();
    await renderHook(() => useInit(init));

    expect(init).toHaveBeenCalledTimes(2);
  });

  it('logs async init rejection', async () => {
    const error = new Error('init failed');
    const init = jest.fn(async () => {
      throw error;
    });

    await renderHook(() => useInit(init));

    await act(async () => {
      await Promise.resolve();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });
});
