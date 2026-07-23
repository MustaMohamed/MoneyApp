const mockScheduledCallbacks: Array<() => void> = [];
const mockNativeCancel = jest.fn();

import { InteractionManager } from 'react-native';

import { runAfterInteractions } from '@/utils/run_after_interactions';

describe('runAfterInteractions', () => {
  beforeEach(() => {
    mockScheduledCallbacks.length = 0;
    mockNativeCancel.mockClear();
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation((callback) => {
      mockScheduledCallbacks.push(callback as () => void);
      return { cancel: mockNativeCancel } as unknown as ReturnType<
        typeof InteractionManager.runAfterInteractions
      >;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('schedules callbacks after interactions', () => {
    const callback = jest.fn();

    runAfterInteractions(callback);

    expect(InteractionManager.runAfterInteractions).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();

    mockScheduledCallbacks[0]?.();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cancellation prevents the scheduled callback', () => {
    const callback = jest.fn();

    const task = runAfterInteractions(callback);
    task.cancel();
    mockScheduledCallbacks[0]?.();

    expect(mockNativeCancel).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
  });

  it('delivers async rejection to the owned error handler without a timer throw', async () => {
    const error = new Error('load failed');
    const onError = jest.fn();
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(() => 0 as never);

    runAfterInteractions(() => Promise.reject(error), { onError });
    mockScheduledCallbacks[0]?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  it('delivers synchronous failures through the same handler', () => {
    const error = new Error('sync failed');
    const onError = jest.fn();
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(() => 0 as never);

    runAfterInteractions(
      () => {
        throw error;
      },
      { onError },
    );
    mockScheduledCallbacks[0]?.();

    expect(onError).toHaveBeenCalledWith(error);
    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  it('logs an unhandled deferred failure without throwing it', async () => {
    const error = new Error('unhandled');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(() => 0 as never);

    runAfterInteractions(() => Promise.reject(error));
    mockScheduledCallbacks[0]?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[runAfterInteractions] task failed:', error);
    expect(timeoutSpy).not.toHaveBeenCalled();
  });

  it('contains failures thrown by the supplied error handler', () => {
    const taskError = new Error('task failed');
    const handlerError = new Error('handler failed');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    runAfterInteractions(
      () => {
        throw taskError;
      },
      {
        onError: () => {
          throw handlerError;
        },
      },
    );

    expect(() => mockScheduledCallbacks[0]?.()).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[runAfterInteractions] error handler failed:',
      handlerError,
    );
  });

  it('suppresses rejection delivery after cancellation', async () => {
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((_, rejectPromise) => {
      reject = rejectPromise;
    });
    const onError = jest.fn();
    const task = runAfterInteractions(() => promise, { onError });
    mockScheduledCallbacks[0]?.();

    task.cancel();
    reject(new Error('late failure'));
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).not.toHaveBeenCalled();
  });
});
