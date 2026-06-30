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

  it('runs init on mount', () => {
    const init = jest.fn();

    renderHook(() => useInit(init));

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('does not re-run when the hook rerenders', () => {
    const init = jest.fn();

    const { rerender } = renderHook(() => useInit(init));
    expect(init).toHaveBeenCalledTimes(1);

    rerender({});

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('runs init once per mounted hook instance', () => {
    const init = jest.fn();

    const first = renderHook(() => useInit(init));
    first.unmount();
    renderHook(() => useInit(init));

    expect(init).toHaveBeenCalledTimes(2);
  });

  it('logs async init rejection', async () => {
    const error = new Error('init failed');
    const init = jest.fn(async () => {
      throw error;
    });

    renderHook(() => useInit(init));

    await act(async () => {
      await Promise.resolve();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });
});
