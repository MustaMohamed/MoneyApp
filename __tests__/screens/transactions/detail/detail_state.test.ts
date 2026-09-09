import {
  INITIAL_UI_ENTRY,
  useTxDetailState,
} from '@/modules/transactions/screens/transactions/detail/detail.state';

const entryOf = (owner: string) => useTxDetailState.getState().entries[owner];

beforeEach(() => {
  useTxDetailState.getState().reset();
});

describe('useTxDetailState initial state', () => {
  it('starts with no copy owning anything', () => {
    expect(useTxDetailState.getState().entries).toEqual({});
  });

  it('reads a copy that has not acted yet as idle, hidden, and not deleting', () => {
    expect(INITIAL_UI_ENTRY).toEqual({
      activeId: undefined,
      status: 'idle',
      revalidating: false,
      refreshError: false,
      confirmVisible: false,
      deleting: false,
      reloadKey: 0,
    });
  });
});

describe('useTxDetailState setters', () => {
  it('begins an initial load for a new route', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);

    expect(entryOf('owner-a')).toMatchObject({
      activeId: 't1',
      status: 'initialLoading',
      revalidating: false,
      refreshError: false,
    });
  });

  it('revalidates a ready route without replacing its state', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().resolve('owner-a', 't1');

    useTxDetailState.getState().beginLoad('owner-a', 't1', true);

    expect(entryOf('owner-a')).toMatchObject({
      status: 'ready',
      revalidating: true,
      refreshError: false,
    });
  });

  it('resolves not-found independently from a request failure', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().resolveNotFound('owner-a', 't1');

    expect(entryOf('owner-a')).toMatchObject({
      status: 'notFound',
      revalidating: false,
    });
  });

  it('exposes first-load errors without calling them not-found', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().failLoad('owner-a', 't1', false);

    expect(entryOf('owner-a')).toMatchObject({
      status: 'firstLoadError',
      revalidating: false,
      refreshError: false,
    });
  });

  it('keeps ready state when revalidation fails', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().resolve('owner-a', 't1');
    useTxDetailState.getState().beginLoad('owner-a', 't1', true);

    useTxDetailState.getState().failLoad('owner-a', 't1', true);

    expect(entryOf('owner-a')).toMatchObject({
      status: 'ready',
      revalidating: false,
      refreshError: true,
    });
  });

  it('ignores completions owned by an obsolete route', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().beginLoad('owner-a', 't2', false);

    useTxDetailState.getState().resolve('owner-a', 't1');

    expect(entryOf('owner-a')).toMatchObject({
      activeId: 't2',
      status: 'initialLoading',
    });
  });

  it('setConfirmVisible toggles the confirm dialog', () => {
    useTxDetailState.getState().setConfirmVisible('owner-a', true);
    expect(entryOf('owner-a').confirmVisible).toBe(true);
    useTxDetailState.getState().setConfirmVisible('owner-a', false);
    expect(entryOf('owner-a').confirmVisible).toBe(false);
  });

  it('setDeleting toggles the deleting flag', () => {
    useTxDetailState.getState().setDeleting('owner-a', true);
    expect(entryOf('owner-a').deleting).toBe(true);
    useTxDetailState.getState().setDeleting('owner-a', false);
    expect(entryOf('owner-a').deleting).toBe(false);
  });

  it('bumpReload increments reloadKey by 1 each call', () => {
    useTxDetailState.getState().bumpReload('owner-a');
    expect(entryOf('owner-a').reloadKey).toBe(1);
    useTxDetailState.getState().bumpReload('owner-a');
    expect(entryOf('owner-a').reloadKey).toBe(2);
  });
});

describe('useTxDetailState owner isolation', () => {
  it('a second copy starting a load leaves the first copy untouched', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().resolve('owner-a', 't1');
    useTxDetailState.getState().setConfirmVisible('owner-a', true);
    useTxDetailState.getState().bumpReload('owner-a');
    const before = entryOf('owner-a');

    useTxDetailState.getState().beginLoad('owner-b', 't2', false);

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-b')).toMatchObject({ activeId: 't2', status: 'initialLoading' });
  });

  it('a second copy reloading does not re-query the first', () => {
    useTxDetailState.getState().bumpReload('owner-a');

    useTxDetailState.getState().bumpReload('owner-b');
    useTxDetailState.getState().bumpReload('owner-b');

    expect(entryOf('owner-a').reloadKey).toBe(1);
    expect(entryOf('owner-b').reloadKey).toBe(2);
  });

  it('a second copy failing its load leaves the first copy ready', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().resolve('owner-a', 't1');
    useTxDetailState.getState().beginLoad('owner-b', 't1', false);

    useTxDetailState.getState().failLoad('owner-b', 't1', false);

    expect(entryOf('owner-a').status).toBe('ready');
    expect(entryOf('owner-b').status).toBe('firstLoadError');
  });

  it('a second copy opening its delete confirm leaves the first copy closed', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().setDeleting('owner-b', true);

    useTxDetailState.getState().setConfirmVisible('owner-b', true);

    expect(entryOf('owner-a')).toMatchObject({ confirmVisible: false, deleting: false });
    expect(entryOf('owner-b')).toMatchObject({ confirmVisible: true, deleting: true });
  });
});

describe('useTxDetailState release', () => {
  it('removes only the released copy', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().beginLoad('owner-b', 't2', false);
    const before = entryOf('owner-a');

    useTxDetailState.getState().release('owner-b');

    expect(entryOf('owner-a')).toBe(before);
    expect(Object.keys(useTxDetailState.getState().entries)).toEqual(['owner-a']);
  });

  it('releasing a copy that never acted leaves the store identical', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    const before = useTxDetailState.getState().entries;

    useTxDetailState.getState().release('owner-b');

    expect(useTxDetailState.getState().entries).toBe(before);
  });
});

describe('useTxDetailState reset', () => {
  it('drops every copy', () => {
    useTxDetailState.getState().setConfirmVisible('owner-a', true);
    useTxDetailState.getState().setDeleting('owner-b', true);
    useTxDetailState.getState().bumpReload('owner-a');

    useTxDetailState.getState().reset();

    expect(useTxDetailState.getState().entries).toEqual({});
  });
});
