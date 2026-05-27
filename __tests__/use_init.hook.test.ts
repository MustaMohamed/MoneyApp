import { signal } from '@preact/signals-react';
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

  it('does not re-run when a signal read inside init changes', () => {
    const value = signal(0);
    const init = jest.fn(() => {
      value.value;
    });

    const { rerender } = renderHook(() => useInit(init));
    expect(init).toHaveBeenCalledTimes(1);

    act(() => {
      value.value = 1;
    });
    rerender({});

    expect(init).toHaveBeenCalledTimes(1);
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
