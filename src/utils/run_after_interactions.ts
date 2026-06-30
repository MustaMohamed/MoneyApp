import { InteractionManager } from 'react-native';

export type RunAfterInteractionsTask = {
  cancel: () => void;
};

function rethrowAsync(error: unknown) {
  setTimeout(() => {
    throw error;
  }, 0);
}

export function runAfterInteractions(
  callback: () => void | Promise<void>,
): RunAfterInteractionsTask {
  let cancelled = false;
  // oxlint-disable-next-line typescript/no-deprecated -- keeps focus reloads behind active navigation interactions.
  const task = InteractionManager.runAfterInteractions(() => {
    if (cancelled) return;
    try {
      const result = callback();
      void Promise.resolve(result).catch(rethrowAsync);
    } catch (error) {
      rethrowAsync(error);
    }
  });

  return {
    cancel: () => {
      cancelled = true;
      task.cancel();
    },
  };
}
