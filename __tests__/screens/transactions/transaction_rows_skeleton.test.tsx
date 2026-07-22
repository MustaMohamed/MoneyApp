import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT,
} from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { TransactionRowsSkeleton } from '@/modules/transactions/screens/transactions/components/transaction_rows_skeleton';
import { ms } from '@/utils/responsive';

jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Group = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, null, children);
  const Item = (props: object) => React.createElement(View, props);
  return { SkeletonGroup: Object.assign(Group, { Item }) };
});

describe('TransactionRowsSkeleton', () => {
  it('shares the loaded row track dimensions', () => {
    const { getAllByTestId } = render(<TransactionRowsSkeleton />);

    expect(getAllByTestId('transaction-row-skeleton-icon')[0]).toHaveStyle({
      width: ms(36),
      height: ms(36),
    });
    expect(getAllByTestId('transaction-row-skeleton-value')[0]).toHaveStyle({ width: ms(120) });
    for (const row of getAllByTestId('transaction-row-skeleton')) {
      expect(row).toHaveStyle({ height: TRANSACTION_ROW_HEIGHT });
    }
  });

  it('reserves optional note and secondary-amount tracks on every row', () => {
    const { getAllByTestId } = render(<TransactionRowsSkeleton />);

    expect(getAllByTestId('transaction-row-skeleton-note')).toHaveLength(5);
    expect(getAllByTestId('transaction-row-skeleton-secondary-amount')).toHaveLength(5);
    expect(getAllByTestId('transaction-row-skeleton-note')[0]).toHaveStyle({
      height: TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT,
    });
  });
});
