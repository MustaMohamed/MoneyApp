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
      try {
        options.onError(error);
      } catch (handlerError) {
        console.error('[runAfterInteractions] error handler failed:', handlerError);
      }
      return;
    }
    console.error('[runAfterInteractions] task failed:', error);
  };

  const handle = requestIdleCallback(() => {
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
      cancelIdleCallback(handle);
    },
  };
}
