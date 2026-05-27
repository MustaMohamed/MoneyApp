import { useReadyStore } from '@/store/ready.store';

describe('useReadyStore', () => {
  beforeEach(() => {
    useReadyStore.setState({ ready: false });
  });

  it('initialises with ready = false', () => {
    expect(useReadyStore.getState().ready).toBe(false);
  });

  it('setReady(true) sets state.ready to true', () => {
    useReadyStore.getState().setReady(true);
    expect(useReadyStore.getState().ready).toBe(true);
  });

  it('setReady(false) sets state.ready to false', () => {
    useReadyStore.getState().setReady(true);
    useReadyStore.getState().setReady(false);
    expect(useReadyStore.getState().ready).toBe(false);
  });
});
