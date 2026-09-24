import { render, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { lineHeightFor, Size } from '@/constants/theme';
import {
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
} from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { TransactionRowsSkeleton } from '@/modules/transactions/screens/transactions/components/transaction_rows_skeleton';

const BAR = 'skeleton-bar';

jest.mock('heroui-native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Group = ({ children }: { children?: ReactNode }) =>
    React.createElement(View, null, children);
  const Item = (props: { testID?: string }) =>
    React.createElement(View, { ...props, testID: props.testID ?? 'skeleton-bar' });
  return { SkeletonGroup: Object.assign(Group, { Item }) };
});

function barHeight(bar: { props: { style?: StyleProp<ViewStyle> } }): ViewStyle['height'] {
  return StyleSheet.flatten(bar.props.style).height;
}

describe('TransactionRowsSkeleton', () => {
  it('shares the loaded row tile, row height and line boxes', async () => {
    const { getAllByTestId } = await render(<TransactionRowsSkeleton />);

    expect(getAllByTestId('transaction-row-skeleton-icon')[0]).toHaveStyle({
      width: Size.accountTile,
      height: Size.accountTile,
    });
    const rows = getAllByTestId('transaction-row-skeleton');
    for (const row of rows) {
      expect(row).toHaveStyle({ height: TRANSACTION_ROW_HEIGHT });
    }
    expect(within(rows[0]!).getAllByTestId(BAR).map(barHeight)).toEqual([
      lineHeightFor(TRANSACTION_ROW_TITLE_FONT_SIZE),
      lineHeightFor(TRANSACTION_ROW_CAPTION_FONT_SIZE),
      lineHeightFor(TRANSACTION_ROW_AMOUNT_FONT_SIZE),
      lineHeightFor(TRANSACTION_ROW_CODE_FONT_SIZE),
    ]);
    expect(
      within(getAllByTestId('transaction-row-skeleton-value')[0]!)
        .getAllByTestId(BAR)
        .map(barHeight),
    ).toEqual([
      lineHeightFor(TRANSACTION_ROW_AMOUNT_FONT_SIZE),
      lineHeightFor(TRANSACTION_ROW_CODE_FONT_SIZE),
    ]);
  });
});
