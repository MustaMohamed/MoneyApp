import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SummaryHeader } from '@/modules/commitments/screens/commitments/components/summary_header';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const SkeletonGroupRoot = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, { testID: 'skeleton-group' }, children);
  const SkeletonGroupItem = ({
    children,
    isLoading,
  }: {
    children?: ReactNode;
    isLoading?: boolean;
  }) => React.createElement(View, { testID: 'skeleton-item' }, isLoading ? null : children);
  return {
    Card: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
    SkeletonGroup: Object.assign(SkeletonGroupRoot, { Item: SkeletonGroupItem }),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('SummaryHeader skeleton loading', () => {
  it('does not render final-looking empty values while payments load', () => {
    const { queryByText, getAllByTestId } = render(
      <SummaryHeader
        counts={{ paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 }}
        totalsByCurrency={new Map()}
        isLoading
      />,
    );

    expect(queryByText('—')).toBeNull();
    expect(queryByText('0%')).toBeNull();
    expect(getAllByTestId('skeleton-item').length).toBeGreaterThanOrEqual(5);
  });
});
