import { useTransactionDeleteState } from '@/modules/transactions/screens/transactions/transaction_delete.state';
import { makeTestTransaction } from '@/test_helpers/transaction';

const TX = makeTestTransaction({ id: 'tx-1' });
const OTHER_TX = makeTestTransaction({ id: 'tx-2' });

const actions = () => useTransactionDeleteState.getState();
const entryOf = (owner: string) => useTransactionDeleteState.getState().entries[owner];

beforeEach(() => {
  useTransactionDeleteState.getState().reset();
});

describe('useTransactionDeleteState request', () => {
  it('starts with no owner holding a dialog', () => {
    expect(useTransactionDeleteState.getState().entries).toEqual({});
  });

  it('opens the dialog over the transaction, not busy and with no failure line', () => {
    actions().request('owner-a', TX);

    expect(entryOf('owner-a')).toEqual({
      transaction: TX,
      isOpen: true,
      busy: false,
      errorMessage: undefined,
    });
  });

  it('a request while the delete is busy leaves the entry the same object', () => {
    actions().request('owner-a', TX);
    actions().begin('owner-a');
    const before = entryOf('owner-a');

    actions().request('owner-a', OTHER_TX);

    expect(entryOf('owner-a')).toBe(before);
  });
});

describe('useTransactionDeleteState begin and fail', () => {
  it('a failed delete keeps the dialog open with its line, no longer busy', () => {
    actions().request('owner-a', TX);
    actions().begin('owner-a');
    expect(entryOf('owner-a')).toMatchObject({ isOpen: true, busy: true });

    actions().fail('owner-a', 'Could not delete.');

    expect(entryOf('owner-a')).toEqual({
      transaction: TX,
      isOpen: true,
      busy: false,
      errorMessage: 'Could not delete.',
    });
  });

  it('a retry after a failure clears the line while it is busy', () => {
    actions().request('owner-a', TX);
    actions().begin('owner-a');
    actions().fail('owner-a', 'Could not delete.');

    actions().begin('owner-a');

    expect(entryOf('owner-a')).toMatchObject({ busy: true, errorMessage: undefined });
  });

  it('a second begin while busy leaves the entry the same object', () => {
    actions().request('owner-a', TX);
    actions().begin('owner-a');
    const before = entryOf('owner-a');

    actions().begin('owner-a');

    expect(entryOf('owner-a')).toBe(before);
  });

  it('a begin on a closed entry leaves it the same object', () => {
    actions().request('owner-a', TX);
    actions().cancel('owner-a');
    const before = entryOf('owner-a');

    actions().begin('owner-a');

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-a').busy).toBe(false);
  });
});

describe('useTransactionDeleteState cancel and succeed', () => {
  it('a cancel while busy is refused', () => {
    actions().request('owner-a', TX);
    actions().begin('owner-a');
    const before = entryOf('owner-a');

    actions().cancel('owner-a');

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-a').isOpen).toBe(true);
  });

  it('a cancel after a failure closes the dialog, drops the line and keeps the transaction', () => {
    actions().request('owner-a', TX);
    actions().begin('owner-a');
    actions().fail('owner-a', 'Could not delete.');

    actions().cancel('owner-a');

    expect(entryOf('owner-a')).toEqual({
      transaction: TX,
      isOpen: false,
      busy: false,
      errorMessage: undefined,
    });
  });

  it('a success closes the dialog and keeps the transaction for the body', () => {
    actions().request('owner-a', TX);
    actions().begin('owner-a');

    actions().succeed('owner-a');

    expect(entryOf('owner-a')).toEqual({
      transaction: TX,
      isOpen: false,
      busy: false,
      errorMessage: undefined,
    });
  });
});

describe('useTransactionDeleteState owner isolation', () => {
  it("a second owner's request, begin and fail leave the first owner's entry the same object", () => {
    actions().request('owner-a', TX);
    const before = entryOf('owner-a');

    actions().request('owner-b', OTHER_TX);
    actions().begin('owner-b');
    actions().fail('owner-b', 'Could not delete.');

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-b')).toEqual({
      transaction: OTHER_TX,
      isOpen: true,
      busy: false,
      errorMessage: 'Could not delete.',
    });
  });
});

describe('useTransactionDeleteState release and reset', () => {
  it('release drops only the released owner', () => {
    actions().request('owner-a', TX);
    actions().request('owner-b', OTHER_TX);
    const before = entryOf('owner-a');

    actions().release('owner-b');

    expect(entryOf('owner-a')).toBe(before);
    expect(Object.keys(useTransactionDeleteState.getState().entries)).toEqual(['owner-a']);
  });

  it('releasing an owner with no entry leaves the entries the same object', () => {
    actions().request('owner-a', TX);
    const before = useTransactionDeleteState.getState().entries;

    actions().release('owner-b');

    expect(useTransactionDeleteState.getState().entries).toBe(before);
  });

  it("a released owner's late begin, fail, cancel and succeed resurrect nothing", () => {
    actions().request('owner-a', TX);
    actions().release('owner-a');

    actions().begin('owner-a');
    actions().fail('owner-a', 'Could not delete.');
    actions().cancel('owner-a');
    actions().succeed('owner-a');

    expect(useTransactionDeleteState.getState().entries).toEqual({});
  });

  it('reset drops every owner', () => {
    actions().request('owner-a', TX);
    actions().request('owner-b', OTHER_TX);
    actions().begin('owner-b');

    actions().reset();

    expect(useTransactionDeleteState.getState().entries).toEqual({});
  });
});
