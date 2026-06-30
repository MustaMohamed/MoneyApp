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
});
