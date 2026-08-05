import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  DETAIL_ACCOUNT_ROW_HEIGHT,
  DETAIL_HERO_MIN_HEIGHT,
  DETAIL_ROW_HEIGHT,
} from '@/modules/transactions/screens/transactions/detail/components/detail_geometry';
import { TransactionDetailSkeleton } from '@/modules/transactions/screens/transactions/detail/components/detail_skeleton';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Group = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, null, children);
  const Item = (props: object) => React.createElement(View, props);
  return {
    Card: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
    SkeletonGroup: Object.assign(Group, { Item }),
  };
});

describe('TransactionDetailSkeleton', () => {
  it('uses a neutral loading surface when transaction geometry is unknown', async () => {
    const { getByTestId, queryByTestId } = await render(<TransactionDetailSkeleton />);

    expect(getByTestId('transaction-detail-neutral-loading')).toBeTruthy();
    expect(queryByTestId('transaction-detail-skeleton-rows')).toBeNull();
  });

  it('matches the optional transfer, metadata, note, and action sections', async () => {
    const transaction: Transaction = {
      id: 'transfer-1',
      type: TransactionType.Transfer,
      amount: 100,
      currency: Currency.USD,
      egp_amount: 4_850,
      exchange_rate: 48.5,
      to_amount: 4_850,
      minimum_payment_snapshot: null,
      revolving_balance_delta: null,
      account_id: 'source',
      to_account_id: 'destination',
      category_id: null,
      budget_id: 'budget-1',
      note: 'Trip transfer',
      transaction_date: '2026-07-19',
      transaction_time: '12:00:00',
      commitment_payment_id: null,
      installment_id: null,
      created_at: '2026-07-19T12:00:00.000Z',
      updated_at: '2026-07-19T12:00:00.000Z',
    };
    const { getAllByTestId, getByTestId } = await render(
      <TransactionDetailSkeleton transaction={transaction} />,
    );

    expect(getByTestId('transaction-detail-skeleton-transfer')).toBeTruthy();
    expect(getByTestId('transaction-detail-skeleton-hero')).toHaveStyle({
      minHeight: DETAIL_HERO_MIN_HEIGHT,
    });
    expect(getByTestId('transaction-detail-skeleton-note')).toBeTruthy();
    expect(getByTestId('transaction-detail-skeleton-actions')).toBeTruthy();
    expect(getAllByTestId('transaction-detail-skeleton-row')).toHaveLength(7);
    const rows = getAllByTestId('transaction-detail-skeleton-row');
    expect(rows[0]).toHaveStyle({ height: DETAIL_ROW_HEIGHT });
    expect(rows[1]).toHaveStyle({ height: DETAIL_ACCOUNT_ROW_HEIGHT });
    for (const row of rows.slice(2)) expect(row).toHaveStyle({ height: DETAIL_ROW_HEIGHT });
  });
});
