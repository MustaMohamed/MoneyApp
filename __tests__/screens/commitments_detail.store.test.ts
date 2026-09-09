import { CommitmentPaymentStatus, Currency } from '@/constants/enums';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  INITIAL_DATA_ENTRY,
  useCommitmentDetailStore,
} from '@/modules/commitments/screens/commitments/detail/detail.store';

const entryOf = (owner: string) => useCommitmentDetailStore.getState().entries[owner];

function makePayment(overrides: Partial<CommitmentPayment> = {}): CommitmentPayment {
  return {
    id: 'pay-1',
    commitment_id: 'commitment-1',
    due_date: '2026-05-01',
    paid_date: null,
    skipped_date: null,
    amount_due: 5000,
    amount_paid: null,
    currency: Currency.EGP,
    exchange_rate_snapshot: null,
    account_id: 'account-1',
    transaction_id: null,
    status: CommitmentPaymentStatus.Due,
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  useCommitmentDetailStore.getState().reset();
});

describe('useCommitmentDetailStore', () => {
  it('starts with no copy holding rows', () => {
    expect(useCommitmentDetailStore.getState().entries).toEqual({});
  });

  it('setAllPayments creates the owner entry with its rows', () => {
    const payments = [makePayment()];

    useCommitmentDetailStore.getState().setAllPayments('owner-a', payments);

    expect(entryOf('owner-a')).toEqual({ allPayments: payments });
  });

  it('setAllPayments replaces only that owner rows on a reload', () => {
    const first = [makePayment({ id: 'pay-1' })];
    const second = [makePayment({ id: 'pay-2' })];
    useCommitmentDetailStore.getState().setAllPayments('owner-a', first);

    useCommitmentDetailStore.getState().setAllPayments('owner-a', second);

    expect(entryOf('owner-a').allPayments).toBe(second);
  });
});

describe('useCommitmentDetailStore owner isolation', () => {
  it('a second copy loading leaves the first copy rows intact', () => {
    const first = [makePayment({ id: 'pay-1' })];
    useCommitmentDetailStore.getState().setAllPayments('owner-a', first);
    const before = entryOf('owner-a');

    useCommitmentDetailStore.getState().setAllPayments('owner-b', [makePayment({ id: 'pay-2' })]);

    expect(entryOf('owner-a')).toBe(before);
    expect(entryOf('owner-b').allPayments).toEqual([makePayment({ id: 'pay-2' })]);
  });
});

describe('useCommitmentDetailStore release', () => {
  it('removes only the released copy', () => {
    useCommitmentDetailStore.getState().setAllPayments('owner-a', [makePayment({ id: 'pay-1' })]);
    useCommitmentDetailStore.getState().setAllPayments('owner-b', [makePayment({ id: 'pay-2' })]);
    const before = entryOf('owner-a');

    useCommitmentDetailStore.getState().release('owner-b');

    expect(entryOf('owner-a')).toBe(before);
    expect(Object.keys(useCommitmentDetailStore.getState().entries)).toEqual(['owner-a']);
  });

  it('releasing a copy that never loaded leaves the store identical', () => {
    useCommitmentDetailStore.getState().setAllPayments('owner-a', [makePayment()]);
    const before = useCommitmentDetailStore.getState().entries;

    useCommitmentDetailStore.getState().release('owner-b');

    expect(useCommitmentDetailStore.getState().entries).toBe(before);
  });

  it('reset drops every copy', () => {
    useCommitmentDetailStore.getState().setAllPayments('owner-a', [makePayment()]);

    useCommitmentDetailStore.getState().reset();

    expect(useCommitmentDetailStore.getState().entries).toEqual({});
  });
});

describe('INITIAL_DATA_ENTRY', () => {
  it('shares one immutable payments array across every unkeyed read', () => {
    expect(Object.isFrozen(INITIAL_DATA_ENTRY.allPayments)).toBe(true);
    expect(() => INITIAL_DATA_ENTRY.allPayments.push(makePayment())).toThrow(TypeError);
  });
});
