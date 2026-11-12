// An idle slot never comes while the JS thread stays busy, so the load runs by this deadline.
export const RUN_AFTER_INTERACTIONS_TIMEOUT_MS = 250;

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

  const handle = requestIdleCallback(
    () => {
      if (cancelled) return;
      try {
        const result = callback();
        void Promise.resolve(result).catch(deliverError);
      } catch (error) {
        deliverError(error);
      }
    },
    { timeout: RUN_AFTER_INTERACTIONS_TIMEOUT_MS },
  );

  return {
    cancel: () => {
      cancelled = true;
      cancelIdleCallback(handle);
    },
  };
}
