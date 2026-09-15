import { CommitmentPaymentStatus, Currency } from '@/constants/enums';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  overlayStorePayments,
  resolveCommitmentDetailViewState,
  type CommitmentDetailViewState,
  type CommitmentDetailViewStateInput,
} from '@/modules/commitments/screens/commitments/detail/detail.helpers';

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

describe('resolveCommitmentDetailViewState', () => {
  const cases: [string, CommitmentDetailViewStateInput, CommitmentDetailViewState][] = [
    [
      'not found beats a cold load',
      {
        hasCommitment: false,
        ownsStatus: true,
        status: 'loading',
        hasRows: false,
        refreshError: false,
      },
      'notFound',
    ],
    [
      'not found beats a first-load error',
      {
        hasCommitment: false,
        ownsStatus: true,
        status: 'firstLoadError',
        hasRows: false,
        refreshError: false,
      },
      'notFound',
    ],
    [
      'not found beats a refresh error over rows',
      {
        hasCommitment: false,
        ownsStatus: true,
        status: 'ready',
        hasRows: true,
        refreshError: true,
      },
      'notFound',
    ],
    [
      'a cold load reads loading',
      {
        hasCommitment: true,
        ownsStatus: true,
        status: 'loading',
        hasRows: false,
        refreshError: false,
      },
      'loading',
    ],
    [
      'a warm load reads ready',
      {
        hasCommitment: true,
        ownsStatus: true,
        status: 'loading',
        hasRows: true,
        refreshError: false,
      },
      'ready',
    ],
    [
      'a cold failure reads firstLoadError',
      {
        hasCommitment: true,
        ownsStatus: true,
        status: 'firstLoadError',
        hasRows: false,
        refreshError: false,
      },
      'firstLoadError',
    ],
    [
      'a first-load error with rows reads refreshErrorWithData',
      {
        hasCommitment: true,
        ownsStatus: true,
        status: 'firstLoadError',
        hasRows: true,
        refreshError: false,
      },
      'refreshErrorWithData',
    ],
    [
      'a warm failure reads refreshErrorWithData',
      { hasCommitment: true, ownsStatus: true, status: 'ready', hasRows: true, refreshError: true },
      'refreshErrorWithData',
    ],
    [
      'a zero-row success reads ready',
      {
        hasCommitment: true,
        ownsStatus: true,
        status: 'ready',
        hasRows: false,
        refreshError: false,
      },
      'ready',
    ],
    [
      'a success with rows reads ready',
      {
        hasCommitment: true,
        ownsStatus: true,
        status: 'ready',
        hasRows: true,
        refreshError: false,
      },
      'ready',
    ],
    [
      "another commitment's ready status with no rows reads loading",
      {
        hasCommitment: true,
        ownsStatus: false,
        status: 'ready',
        hasRows: false,
        refreshError: false,
      },
      'loading',
    ],
    [
      "another commitment's first-load error with no rows reads loading",
      {
        hasCommitment: true,
        ownsStatus: false,
        status: 'firstLoadError',
        hasRows: false,
        refreshError: false,
      },
      'loading',
    ],
    [
      "another commitment's refresh error never floats over this commitment's rows",
      {
        hasCommitment: true,
        ownsStatus: false,
        status: 'ready',
        hasRows: true,
        refreshError: true,
      },
      'ready',
    ],
  ];

  it.each(cases)('%s', (_label, input, expected) => {
    expect(resolveCommitmentDetailViewState(input)).toBe(expected);
  });
});

describe('overlayStorePayments', () => {
  it("replaces a Due history row with the store's Paid row", () => {
    const due = makePayment({ id: 'pay-1', status: CommitmentPaymentStatus.Due });
    const paid = makePayment({ id: 'pay-1', status: CommitmentPaymentStatus.Paid });

    const result = overlayStorePayments([due], [paid]);

    expect(result).toEqual([paid]);
    expect(result[0]).toBe(paid);
  });

  it('leaves unmatched rows untouched and keeps order and length', () => {
    const older = makePayment({ id: 'pay-0', due_date: '2026-04-01' });
    const current = makePayment({ id: 'pay-1', due_date: '2026-05-01' });
    const next = makePayment({ id: 'pay-2', due_date: '2026-06-01' });
    const skipped = makePayment({ id: 'pay-1', status: CommitmentPaymentStatus.Skipped });
    const elsewhere = makePayment({ id: 'pay-9', commitment_id: 'commitment-2' });

    const result = overlayStorePayments([older, current, next], [elsewhere, skipped]);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe(older);
    expect(result[1]).toBe(skipped);
    expect(result[2]).toBe(next);
  });

  it('returns the same reference when nothing matches', () => {
    const rows = [makePayment({ id: 'pay-1' })];

    expect(overlayStorePayments(rows, [makePayment({ id: 'pay-9' })])).toBe(rows);
    expect(overlayStorePayments(rows, [])).toBe(rows);
  });
});
