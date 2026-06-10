import { InteractionManager } from 'react-native';

export type InteractionWorkHandle = {
  cancel: () => void;
};

export function runAfterInteractions(callback: () => void | Promise<void>): InteractionWorkHandle {
  let cancelled = false;
  // oxlint-disable-next-line typescript/no-deprecated -- keeps focus reloads behind active navigation interactions.
  const task = InteractionManager.runAfterInteractions(() => {
    if (cancelled) return;

    try {
      const result = callback();
      void Promise.resolve(result).catch((err: unknown) => {
        setTimeout(() => {
          throw err;
        }, 0);
      });
    } catch (err) {
      setTimeout(() => {
        throw err;
      }, 0);
    }
  });

  return {
    cancel: () => {
      cancelled = true;
      task.cancel();
    },
  };
}
