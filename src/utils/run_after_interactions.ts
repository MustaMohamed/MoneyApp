import { InteractionManager } from 'react-native';

export type RunAfterInteractionsTask = {
  cancel: () => void;
};

interface RunAfterInteractionsOptions {
  onError?: (error: unknown) => void;
}

export function runAfterInteractions(
  callback: () => void | Promise<void>,
  options: RunAfterInteractionsOptions = {},
): RunAfterInteractionsTask {
  let cancelled = false;
  const deliverError = (error: unknown) => {
    if (cancelled) return;
    if (options.onError) {
      options.onError(error);
      return;
    }
    console.error('[runAfterInteractions] task failed:', error);
  };

  // oxlint-disable-next-line typescript/no-deprecated -- defer until navigation interactions finish.
  const task = InteractionManager.runAfterInteractions(() => {
    if (cancelled) return;
    try {
      const result = callback();
      void Promise.resolve(result).catch(deliverError);
    } catch (error) {
      deliverError(error);
    }
  });

  return {
    cancel: () => {
      cancelled = true;
      task.cancel();
    },
  };
}
