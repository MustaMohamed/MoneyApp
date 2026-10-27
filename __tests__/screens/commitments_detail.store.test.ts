import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentMonthPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  INITIAL_DATA_ENTRY,
  useCommitmentDetailStore,
} from '@/modules/commitments/screens/commitments/detail/detail.store';
import { makeTestCommitment, makeTestMonthPayment } from '@/test_helpers/commitment';

const entryOf = (owner: string) => useCommitmentDetailStore.getState().entries[owner];

const LOADED_ON = '2026-05-08';

function makePayment(overrides: Partial<CommitmentMonthPayment> = {}): CommitmentMonthPayment {
  return makeTestMonthPayment({
    id: 'pay-1',
    commitment_id: 'commitment-1',
    due_date: '2026-05-01',
    amount_due: 5000,
    account_id: 'account-1',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}

function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return makeTestCommitment({
    id: 'commitment-1',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  });
}

beforeEach(() => {
  useCommitmentDetailStore.getState().reset();
});

describe('useCommitmentDetailStore', () => {
  it('starts with no copy holding a detail', () => {
    expect(useCommitmentDetailStore.getState().entries).toEqual({});
  });

  it('setDetail creates the owner entry with its commitment, rows, cycle and load date', () => {
    const commitment = makeCommitment();
    const payments = [makePayment()];

    useCommitmentDetailStore.getState().setDetail('owner-a', 'commitment-1', {
      commitment,
      allPayments: payments,
      cycleId: 'pay-1',
      loadedOn: LOADED_ON,
    });

    expect(entryOf('owner-a')).toStrictEqual({
      commitmentId: 'commitment-1',
      commitment,
      allPayments: payments,
      cycleId: 'pay-1',
      loadedOn: LOADED_ON,
    });
    expect(entryOf('owner-a').allPayments).toBe(payments);
  });

  it('setDetail keeps a read that found no commitment as an undefined commitment and cycle', () => {
    useCommitmentDetailStore.getState().setDetail('owner-a', 'commitment-missing', {
      commitment: undefined,
      allPayments: [],
      cycleId: undefined,
      loadedOn: LOADED_ON,
    });

    expect(entryOf('owner-a')).toStrictEqual({
      commitmentId: 'commitment-missing',
      commitment: undefined,
      allPayments: [],
      cycleId: undefined,
      loadedOn: LOADED_ON,
    });
  });

  it('setDetail replaces only that owner detail on a reload', () => {
    const first = [makePayment({ id: 'pay-1' })];
    const second = [makePayment({ id: 'pay-2' })];
    const stopped = makeCommitment({ is_active: 0 });
    useCommitmentDetailStore.getState().setDetail('owner-a', 'commitment-1', {
      commitment: makeCommitment(),
      allPayments: first,
      cycleId: 'pay-1',
      loadedOn: LOADED_ON,
    });

    useCommitmentDetailStore.getState().setDetail('owner-a', 'commitment-1', {
      commitment: stopped,
      allPayments: second,
      cycleId: 'pay-2',
      loadedOn: '2026-05-09',
    });

    expect(entryOf('owner-a').allPayments).toBe(second);
    expect(entryOf('owner-a').commitment).toBe(stopped);
    expect(entryOf('owner-a').cycleId).toBe('pay-2');
    expect(entryOf('owner-a').loadedOn).toBe('2026-05-09');
  });
});

describe('useCommitmentDetailStore owner isolation', () => {
  it('a second copy loading leaves the first copy detail intact', () => {
    useCommitmentDetailStore.getState().setDetail('owner-a', 'commitment-1', {
      commitment: makeCommitment(),
      allPayments: [makePayment({ id: 'pay-1' })],
      cycleId: 'pay-1',
      loadedOn: LOADED_ON,
    });
    const before = entryOf('owner-a');

    useCommitmentDetailStore.getState().setDetail('owner-b', 'commitment-2', {
      commitment: makeCommitment({ id: 'commitment-2' }),
      allPayments: [makePayment({ id: 'pay-2', commitment_id: 'commitment-2' })],
      cycleId: 'pay-2',
      loadedOn: LOADED_ON,
    });

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-b').commitmentId).toBe('commitment-2');
    expect(entryOf('owner-b').cycleId).toBe('pay-2');
  });
});

describe('useCommitmentDetailStore release', () => {
  function seed(owner: string, commitmentId: string): void {
    useCommitmentDetailStore.getState().setDetail(owner, commitmentId, {
      commitment: makeCommitment({ id: commitmentId }),
      allPayments: [makePayment({ commitment_id: commitmentId })],
      cycleId: 'pay-1',
      loadedOn: LOADED_ON,
    });
  }

  it('removes only the released copy', () => {
    seed('owner-a', 'commitment-1');
    seed('owner-b', 'commitment-2');
    const before = entryOf('owner-a');

    useCommitmentDetailStore.getState().release('owner-b');

    expect(entryOf('owner-a')).toBe(before);
    expect(Object.keys(useCommitmentDetailStore.getState().entries)).toEqual(['owner-a']);
  });

  it('releasing a copy that never loaded leaves the store identical', () => {
    seed('owner-a', 'commitment-1');
    const before = useCommitmentDetailStore.getState().entries;

    useCommitmentDetailStore.getState().release('owner-b');

    expect(useCommitmentDetailStore.getState().entries).toBe(before);
  });

  it('reset drops every copy', () => {
    seed('owner-a', 'commitment-1');

    useCommitmentDetailStore.getState().reset();

    expect(useCommitmentDetailStore.getState().entries).toEqual({});
  });
});

describe('INITIAL_DATA_ENTRY', () => {
  it('reads not loaded: no commitment, no cycle, no load date', () => {
    expect(INITIAL_DATA_ENTRY).toStrictEqual({
      commitmentId: undefined,
      commitment: undefined,
      allPayments: [],
      cycleId: undefined,
      loadedOn: undefined,
    });
  });

  it('shares one immutable payments array across every unkeyed read', () => {
    expect(Object.isFrozen(INITIAL_DATA_ENTRY.allPayments)).toBe(true);
    expect(() => INITIAL_DATA_ENTRY.allPayments.push(makePayment())).toThrow(TypeError);
  });
});
