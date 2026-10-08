import { render, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { lineHeightFor, Radius, Size } from '@/constants/theme';
import {
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
  resolveTransactionRowCaptionLines,
  resolveTransactionRowHeight,
} from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { TransactionRowsSkeleton } from '@/modules/transactions/screens/transactions/components/transaction_rows_skeleton';
import { resolveDayHeaderGeometry } from '@/modules/transactions/screens/transactions/components/transactions_text.geometry';

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

function lineBar(fontSize: number): number {
  return resolveSkeletonBarHeight(lineHeightFor(fontSize), Dimensions.get('window').fontScale);
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
      expect(row).toHaveStyle({
        height: resolveTransactionRowHeight(Dimensions.get('window').fontScale),
      });
    }
    const captionBars = Array.from(
      { length: resolveTransactionRowCaptionLines(Dimensions.get('window').fontScale) },
      () => lineBar(TRANSACTION_ROW_CAPTION_FONT_SIZE),
    );
    expect(captionBars).toHaveLength(2);
    expect(within(rows[0]!).getAllByTestId(BAR).map(barHeight)).toEqual([
      lineBar(TRANSACTION_ROW_TITLE_FONT_SIZE),
      ...captionBars,
      lineBar(TRANSACTION_ROW_AMOUNT_FONT_SIZE),
      lineBar(TRANSACTION_ROW_CODE_FONT_SIZE),
    ]);
    expect(
      within(getAllByTestId('transaction-row-skeleton-value')[0]!)
        .getAllByTestId(BAR)
        .map(barHeight),
    ).toEqual([lineBar(TRANSACTION_ROW_AMOUNT_FONT_SIZE), lineBar(TRANSACTION_ROW_CODE_FONT_SIZE)]);
  });

  it('draws no tile when the loaded rows draw none', async () => {
    const { queryAllByTestId, getAllByTestId } = await render(
      <TransactionRowsSkeleton showTile={false} />,
    );

    expect(queryAllByTestId('transaction-row-skeleton-icon')).toHaveLength(0);
    expect(getAllByTestId('transaction-row-skeleton')).toHaveLength(5);
  });

  it('draws day cards of rows under headers as high as the loaded day header', async () => {
    const { getByTestId, getAllByTestId } = await render(
      <TransactionRowsSkeleton dayCards={2} rows={3} />,
    );

    expect(getByTestId('transaction-row-skeletons')).toBeTruthy();
    const headers = getAllByTestId('transaction-day-skeleton-header');
    expect(headers).toHaveLength(2);
    for (const header of headers) {
      expect(header).toHaveStyle({
        height: resolveDayHeaderGeometry(Dimensions.get('window').fontScale).height,
      });
      expect(within(header).getAllByTestId(BAR)).toHaveLength(2);
    }
    const slices = getAllByTestId('day-card-row');
    expect(slices).toHaveLength(6);
    expect(getAllByTestId('transaction-row-skeleton')).toHaveLength(6);
    for (const slice of slices) {
      expect(within(slice).getByTestId('transaction-row-skeleton')).toHaveStyle({
        height: resolveTransactionRowHeight(Dimensions.get('window').fontScale),
      });
    }
    for (const first of [slices[0]!, slices[3]!]) {
      expect(first).toHaveStyle({ borderTopLeftRadius: Radius.lg });
      expect(first).not.toHaveStyle({ borderBottomLeftRadius: Radius.lg });
    }
    for (const middle of [slices[1]!, slices[4]!]) {
      expect(middle).not.toHaveStyle({ borderTopLeftRadius: Radius.lg });
      expect(middle).not.toHaveStyle({ borderBottomLeftRadius: Radius.lg });
    }
    for (const last of [slices[2]!, slices[5]!]) {
      expect(last).toHaveStyle({ borderBottomLeftRadius: Radius.lg });
      expect(last).not.toHaveStyle({ borderTopLeftRadius: Radius.lg });
    }
  });

  it('draws bare rows with no header and no card without day cards', async () => {
    const { queryAllByTestId, getAllByTestId } = await render(<TransactionRowsSkeleton />);

    expect(queryAllByTestId('transaction-day-skeleton-header')).toHaveLength(0);
    expect(queryAllByTestId('day-card-row')).toHaveLength(0);
    const rowBars = getAllByTestId('transaction-row-skeleton').flatMap((row) =>
      within(row).getAllByTestId(BAR),
    );
    expect(getAllByTestId(BAR)).toHaveLength(rowBars.length);
  });
});
