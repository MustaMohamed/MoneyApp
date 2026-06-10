import { InteractionManager } from 'react-native';

import { runAfterInteractions } from '@/utils/run_after_interactions';

// oxlint-disable-next-line typescript/no-deprecated -- test mirrors the helper's RN scheduling API.
type InteractionTask = Parameters<typeof InteractionManager.runAfterInteractions>[0];
// oxlint-disable-next-line typescript/no-deprecated -- test mirrors the helper's RN scheduling API.
type InteractionHandle = ReturnType<typeof InteractionManager.runAfterInteractions>;

function makeInteractionHandle(cancel: () => void): InteractionHandle {
  return {
    then: (onfulfilled) => Promise.resolve().then(onfulfilled),
    done: () => undefined,
    cancel,
  };
}

function runTask(task: InteractionTask): void {
  if (typeof task === 'function') {
    task();
  }
}

describe('runAfterInteractions', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('schedules work after interactions', () => {
    const callback = jest.fn();
    const cancel = jest.fn();
    const runAfterInteractionsSpy = jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task) => {
        runTask(task);
        return makeInteractionHandle(cancel);
      });

    const handle = runAfterInteractions(callback);

    expect(runAfterInteractionsSpy).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    handle.cancel();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('does not run cancelled async work when the interaction completes later', async () => {
    let scheduledTask: InteractionTask;
    const cancel = jest.fn();
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation((task) => {
      scheduledTask = task;
      return makeInteractionHandle(cancel);
    });
    const callback = jest.fn(async () => {});

    const handle = runAfterInteractions(callback);
    handle.cancel();
    runTask(scheduledTask);
    await Promise.resolve();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
  });
});
