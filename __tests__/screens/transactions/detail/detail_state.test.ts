import { useTxDetailState } from '@/modules/transactions/screens/transactions/detail/detail.state';

beforeEach(() => {
  useTxDetailState.getState().reset();
});

describe('useTxDetailState initial state', () => {
  it('starts idle, hidden, and not deleting', () => {
    const s = useTxDetailState.getState();
    expect(s.status).toBe('idle');
    expect(s.activeId).toBeUndefined();
    expect(s.revalidating).toBe(false);
    expect(s.refreshError).toBe(false);
    expect(s.confirmVisible).toBe(false);
    expect(s.deleting).toBe(false);
    expect(s.reloadKey).toBe(0);
  });
});

describe('useTxDetailState setters', () => {
  it('begins an initial load for a new route', () => {
    useTxDetailState.getState().beginLoad('t1', false);

    expect(useTxDetailState.getState()).toMatchObject({
      activeId: 't1',
      status: 'initialLoading',
      revalidating: false,
      refreshError: false,
    });
  });

  it('revalidates a ready route without replacing its state', () => {
    useTxDetailState.getState().beginLoad('t1', false);
    useTxDetailState.getState().resolve('t1');

    useTxDetailState.getState().beginLoad('t1', true);

    expect(useTxDetailState.getState()).toMatchObject({
      status: 'ready',
      revalidating: true,
      refreshError: false,
    });
  });

  it('resolves not-found independently from a request failure', () => {
    useTxDetailState.getState().beginLoad('t1', false);
    useTxDetailState.getState().resolveNotFound('t1');

    expect(useTxDetailState.getState()).toMatchObject({
      status: 'notFound',
      revalidating: false,
    });
  });

  it('exposes first-load errors without calling them not-found', () => {
    useTxDetailState.getState().beginLoad('t1', false);
    useTxDetailState.getState().failLoad('t1', false);

    expect(useTxDetailState.getState()).toMatchObject({
      status: 'firstLoadError',
      revalidating: false,
      refreshError: false,
    });
  });

  it('keeps ready state when revalidation fails', () => {
    useTxDetailState.getState().beginLoad('t1', false);
    useTxDetailState.getState().resolve('t1');
    useTxDetailState.getState().beginLoad('t1', true);

    useTxDetailState.getState().failLoad('t1', true);

    expect(useTxDetailState.getState()).toMatchObject({
      status: 'ready',
      revalidating: false,
      refreshError: true,
    });
  });

  it('ignores completions owned by an obsolete route', () => {
    useTxDetailState.getState().beginLoad('t1', false);
    useTxDetailState.getState().beginLoad('t2', false);

    useTxDetailState.getState().resolve('t1');

    expect(useTxDetailState.getState()).toMatchObject({
      activeId: 't2',
      status: 'initialLoading',
    });
  });

  it('setConfirmVisible toggles the confirm dialog', () => {
    useTxDetailState.getState().setConfirmVisible(true);
    expect(useTxDetailState.getState().confirmVisible).toBe(true);
    useTxDetailState.getState().setConfirmVisible(false);
    expect(useTxDetailState.getState().confirmVisible).toBe(false);
  });

  it('setDeleting toggles the deleting flag', () => {
    useTxDetailState.getState().setDeleting(true);
    expect(useTxDetailState.getState().deleting).toBe(true);
    useTxDetailState.getState().setDeleting(false);
    expect(useTxDetailState.getState().deleting).toBe(false);
  });

  it('bumpReload increments reloadKey by 1 each call', () => {
    useTxDetailState.getState().bumpReload();
    expect(useTxDetailState.getState().reloadKey).toBe(1);
    useTxDetailState.getState().bumpReload();
    expect(useTxDetailState.getState().reloadKey).toBe(2);
  });
});

describe('useTxDetailState reset', () => {
  it('returns every field to its initial value', () => {
    useTxDetailState.getState().setConfirmVisible(true);
    useTxDetailState.getState().setDeleting(true);
    useTxDetailState.getState().bumpReload();
    useTxDetailState.getState().reset();
    const s = useTxDetailState.getState();
    expect(s.status).toBe('idle');
    expect(s.activeId).toBeUndefined();
    expect(s.revalidating).toBe(false);
    expect(s.refreshError).toBe(false);
    expect(s.confirmVisible).toBe(false);
    expect(s.deleting).toBe(false);
    expect(s.reloadKey).toBe(0);
  });
});
