import { useTxDetailState } from '@/modules/transactions/screens/transactions/detail/detail.state';

const entryOf = (owner: string) => useTxDetailState.getState().entries[owner];

beforeEach(() => {
  useTxDetailState.getState().reset();
});

describe('useTxDetailState initial state', () => {
  it('starts with no copy owning anything', () => {
    expect(useTxDetailState.getState().entries).toEqual({});
  });
});

describe('useTxDetailState setters', () => {
  it('begins an initial load for a new route, holding no delete state', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);

    expect(entryOf('owner-a')).toEqual({
      activeId: 't1',
      status: 'initialLoading',
      revalidating: false,
      refreshError: false,
      reloadKey: 0,
      accountLookupSettled: false,
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

  it('bumpReload increments reloadKey by 1 each call', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);

    useTxDetailState.getState().bumpReload('owner-a');
    expect(entryOf('owner-a').reloadKey).toBe(1);
    useTxDetailState.getState().bumpReload('owner-a');
    expect(entryOf('owner-a').reloadKey).toBe(2);
  });
});

describe('useTxDetailState account lookup settled (MA-196)', () => {
  it('a settle marks the active route settled', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().resolve('owner-a', 't1');

    useTxDetailState.getState().settleAccountLookup('owner-a', 't1');

    expect(entryOf('owner-a')).toMatchObject({ activeId: 't1', accountLookupSettled: true });
  });

  it('a settle for an obsolete id changes nothing', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().beginLoad('owner-a', 't2', false);
    const before = useTxDetailState.getState().entries;

    useTxDetailState.getState().settleAccountLookup('owner-a', 't1');

    expect(useTxDetailState.getState().entries).toBe(before);
    expect(entryOf('owner-a').accountLookupSettled).toBe(false);
  });

  it('a settle for a released owner creates no entry', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().release('owner-a');
    const before = useTxDetailState.getState().entries;

    useTxDetailState.getState().settleAccountLookup('owner-a', 't1');

    expect(useTxDetailState.getState().entries).toBe(before);
    expect(useTxDetailState.getState().entries).toEqual({});
  });

  it('a settle for an owner that never loaded creates no entry', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    const before = useTxDetailState.getState().entries;

    useTxDetailState.getState().settleAccountLookup('owner-b', 't1');

    expect(useTxDetailState.getState().entries).toBe(before);
    expect(Object.keys(useTxDetailState.getState().entries)).toEqual(['owner-a']);
  });

  it('beginLoad without preserveData clears a settled entry', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().resolve('owner-a', 't1');
    useTxDetailState.getState().settleAccountLookup('owner-a', 't1');

    useTxDetailState.getState().beginLoad('owner-a', 't1', false);

    expect(entryOf('owner-a')).toMatchObject({
      activeId: 't1',
      status: 'initialLoading',
      accountLookupSettled: false,
    });
  });

  it('beginLoad with preserveData keeps a settled entry settled', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().resolve('owner-a', 't1');
    useTxDetailState.getState().settleAccountLookup('owner-a', 't1');

    useTxDetailState.getState().beginLoad('owner-a', 't1', true);

    expect(entryOf('owner-a')).toMatchObject({
      activeId: 't1',
      revalidating: true,
      accountLookupSettled: true,
    });
  });
});

describe('useTxDetailState owner isolation', () => {
  it('a second copy starting a load leaves the first copy untouched', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().resolve('owner-a', 't1');
    useTxDetailState.getState().bumpReload('owner-a');
    const before = entryOf('owner-a');

    useTxDetailState.getState().beginLoad('owner-b', 't2', false);

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-b')).toMatchObject({ activeId: 't2', status: 'initialLoading' });
  });

  it('a second copy reloading does not re-query the first', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().beginLoad('owner-b', 't2', false);
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

  it('a released copy acting again does not resurrect its entry', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().release('owner-a');

    useTxDetailState.getState().bumpReload('owner-a');

    expect(useTxDetailState.getState().entries).toEqual({});
  });
});

describe('useTxDetailState reset', () => {
  it('drops every copy', () => {
    useTxDetailState.getState().beginLoad('owner-a', 't1', false);
    useTxDetailState.getState().beginLoad('owner-b', 't2', false);
    useTxDetailState.getState().bumpReload('owner-a');

    useTxDetailState.getState().reset();

    expect(useTxDetailState.getState().entries).toEqual({});
  });
});
