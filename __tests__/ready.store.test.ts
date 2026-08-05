import { act } from '@testing-library/react-native';

import { useAppReadyStore } from '@/store/ready.store';

describe('useAppReadyStore', () => {
  beforeEach(async () => {
    await act(() => useAppReadyStore.getState().reset());
  });

  it('starts in the initializing state', () => {
    expect(useAppReadyStore.getState()).toMatchObject({
      status: 'initializing',
      error: null,
    });
  });

  it('begins a new owned startup generation', () => {
    const initialGeneration = useAppReadyStore.getState().generation;
    const first = useAppReadyStore.getState().begin();
    const second = useAppReadyStore.getState().begin();

    expect(first).toBe(initialGeneration + 1);
    expect(second).toBe(initialGeneration + 2);
    expect(useAppReadyStore.getState()).toMatchObject({
      status: 'initializing',
      generation: second,
      error: null,
    });
  });

  it('publishes ready only for the current generation', () => {
    const stale = useAppReadyStore.getState().begin();
    const current = useAppReadyStore.getState().begin();

    useAppReadyStore.getState().resolveReady(stale);
    expect(useAppReadyStore.getState().status).toBe('initializing');

    useAppReadyStore.getState().resolveReady(current);
    expect(useAppReadyStore.getState()).toMatchObject({ status: 'ready', error: null });
  });

  it('publishes a fatal error only for the current generation', () => {
    const stale = useAppReadyStore.getState().begin();
    const current = useAppReadyStore.getState().begin();
    const error = new Error('migration failed');

    useAppReadyStore.getState().rejectFatal(stale, new Error('stale'));
    expect(useAppReadyStore.getState().status).toBe('initializing');

    useAppReadyStore.getState().rejectFatal(current, error);
    expect(useAppReadyStore.getState()).toMatchObject({
      status: 'fatalError',
      error,
    });
  });

  it('keeps the failure context mounted while a retry initializes', () => {
    const failed = useAppReadyStore.getState().begin();
    const error = new Error('database failed');
    useAppReadyStore.getState().rejectFatal(failed, error);

    useAppReadyStore.getState().begin();

    expect(useAppReadyStore.getState()).toMatchObject({
      status: 'initializing',
      error,
    });
  });

  it('reset invalidates outstanding generations', () => {
    const stale = useAppReadyStore.getState().begin();
    useAppReadyStore.getState().reset();
    const resetGeneration = useAppReadyStore.getState().generation;
    useAppReadyStore.getState().resolveReady(stale);

    expect(useAppReadyStore.getState()).toMatchObject({
      status: 'initializing',
      generation: resetGeneration,
      error: null,
    });
  });
});
