import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

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
  });

  it('includes representative expanded row content without changing the shared tracks', () => {
    const { getAllByTestId } = render(<TransactionRowsSkeleton />);

    expect(getAllByTestId('transaction-row-skeleton-note')).toHaveLength(2);
    expect(getAllByTestId('transaction-row-skeleton-note')[0]).toHaveStyle({ height: ms(11) });
  });
});
