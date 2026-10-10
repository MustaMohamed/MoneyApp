import { render, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, type ViewStyle } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  DETAIL_HERO_MIN_HEIGHT,
  resolveDetailRowHeight,
  resolveTransferCardHeight,
  resolveTransferSkeletonCellHeight,
} from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';
import { TransactionDetailSkeleton } from '@/modules/transactions/screens/transactions/detail/components/detail_skeleton';
import { barHeight } from '@/test_helpers/skeleton';

const BAR = 'skeleton-bar';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Group = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, null, children);
  const Item = (props: { testID?: string }) =>
    React.createElement(View, { ...props, testID: props.testID ?? 'skeleton-bar' });
  return {
    Card: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
    SkeletonGroup: Object.assign(Group, { Item }),
  };
});

describe('TransactionDetailSkeleton', () => {
  it('uses a neutral loading surface when transaction geometry is unknown', async () => {
    const { getByTestId, queryByTestId } = await render(<TransactionDetailSkeleton />);

    const loading = getByTestId('transaction-detail-neutral-loading');
    expect(loading).toBeTruthy();
    expect(queryByTestId('transaction-detail-skeleton-rows')).toBeNull();
    expect(within(loading).getAllByTestId(BAR).map(barHeight)).toEqual([undefined]);
  });

  it('matches the optional transfer, metadata, note, and action sections', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    const bar = (height: number): number => resolveSkeletonBarHeight(height, fontScale);

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
    const barsIn = (testID: string): ViewStyle['height'][] =>
      within(getByTestId(testID)).getAllByTestId(BAR).map(barHeight);

    expect(getByTestId('transaction-detail-skeleton-transfer')).toBeTruthy();
    expect(getByTestId('transaction-detail-skeleton-hero')).toHaveStyle({
      minHeight: DETAIL_HERO_MIN_HEIGHT,
    });
    expect(getByTestId('transaction-detail-skeleton-note')).toBeTruthy();
    expect(getByTestId('transaction-detail-skeleton-actions')).toBeTruthy();
    expect(getAllByTestId('transaction-detail-skeleton-row')).toHaveLength(7);

    expect(barsIn('transaction-detail-skeleton-hero')).toEqual([
      bar(20),
      bar(36),
      bar(16),
      bar(12),
    ]);
    expect(barsIn('transaction-detail-skeleton-note')).toEqual([bar(12), bar(16)]);
    expect(barsIn('transaction-detail-skeleton-actions')).toEqual([bar(52), bar(52)]);

    const rows = getAllByTestId('transaction-detail-skeleton-row');
    for (const row of rows) {
      expect(within(row).getAllByTestId(BAR).map(barHeight)).toEqual([undefined, bar(12), bar(16)]);
    }
    expect(rows[0]).toHaveStyle({ height: resolveDetailRowHeight(fontScale) });
    expect(rows[1]).toHaveStyle({ height: resolveDetailRowHeight(fontScale, true) });
    for (const row of rows.slice(2)) {
      expect(row).toHaveStyle({ height: resolveDetailRowHeight(fontScale) });
    }

    expect(getByTestId('transaction-detail-skeleton-transfer')).toHaveStyle({
      height: resolveTransferCardHeight(fontScale),
    });
    const cell = resolveTransferSkeletonCellHeight(fontScale);
    expect(barsIn('transaction-detail-skeleton-transfer')).toEqual([cell, undefined, cell]);
  });
});
