import { render, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Dimensions, type ViewStyle } from 'react-native';

import { resolveFactRowHeight } from '@/components/ui/fact_row.geometry';
import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Currency, TransactionType } from '@/constants/enums';
import { Radius, Size, Type, lineHeightFor } from '@/constants/theme';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  DETAIL_NOTE_MIN_HEIGHT,
  resolveDetailHeroGeometry,
  resolveTransferCardHeight,
  resolveTransferSkeletonCellHeight,
} from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';
import { TransactionDetailSkeleton } from '@/modules/transactions/screens/transactions/detail/components/detail_skeleton';
import { barHeight } from '@/test_helpers/skeleton';

const BAR = 'skeleton-bar';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/components/ui/hero_shell', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HeroShell: ({ children }: { children: ReactNode }) =>
      ReactLocal.createElement(RNView, { testID: 'detail-hero-shell' }, children),
  };
});
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
    ListGroup: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
    SkeletonGroup: Object.assign(Group, { Item }),
    cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
  };
});

describe('TransactionDetailSkeleton', () => {
  const transferHint: Transaction = {
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

  it('uses a neutral loading surface when transaction geometry is unknown', async () => {
    const { getByTestId, queryByTestId } = await render(
      <TransactionDetailSkeleton actionSet="editDelete" />,
    );

    const loading = getByTestId('transaction-detail-neutral-loading');
    expect(loading).toBeTruthy();
    expect(queryByTestId('transaction-detail-skeleton-rows')).toBeNull();
    expect(within(loading).getAllByTestId(BAR).map(barHeight)).toEqual([undefined]);
  });

  it('matches the optional transfer, metadata, note, and action sections', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    const bar = (height: number): number => resolveSkeletonBarHeight(height, fontScale);
    const hero = resolveDetailHeroGeometry(fontScale);

    const { getAllByTestId, getByTestId } = await render(
      <TransactionDetailSkeleton transaction={transferHint} actionSet="editDelete" />,
    );
    const barsIn = (testID: string): ViewStyle['height'][] =>
      within(getByTestId(testID)).getAllByTestId(BAR).map(barHeight);

    expect(getByTestId('transaction-detail-skeleton-transfer')).toBeTruthy();
    expect(getByTestId('transaction-detail-skeleton-hero')).toHaveStyle({ height: hero.height });
    expect(getByTestId('transaction-detail-skeleton-note')).toBeTruthy();
    expect(getByTestId('transaction-detail-skeleton-actions')).toBeTruthy();
    expect(getAllByTestId('transaction-detail-skeleton-row')).toHaveLength(6);

    // Tile, title, badge, overline, amount, caption: the loaded hero's boxes in order.
    expect(barsIn('transaction-detail-skeleton-hero')).toEqual([
      Size.detailHeroTile,
      lineHeightFor(hero.titleFontSize),
      hero.badgeHeight,
      lineHeightFor(hero.overlineFontSize),
      hero.amountHeight,
      lineHeightFor(hero.captionFontSize),
    ]);
    // The loaded note card's overline and one body line, so a one-line note stands as tall loaded.
    expect(barsIn('transaction-detail-skeleton-note')).toEqual([
      bar(lineHeightFor(Type.overline)),
      bar(lineHeightFor(Type.body)),
    ]);
    expect(barsIn('transaction-detail-skeleton-actions')).toEqual([
      Size.ctaFooterTrack,
      Size.ctaFooterTrack,
    ]);

    const rows = getAllByTestId('transaction-detail-skeleton-row');
    for (const row of rows) {
      expect(row).toHaveStyle({ height: resolveFactRowHeight(fontScale) });
      expect(within(row).getAllByTestId(BAR).map(barHeight)).toEqual([bar(14), bar(14)]);
    }

    expect(getByTestId('transaction-detail-skeleton-transfer')).toHaveStyle({
      height: resolveTransferCardHeight(fontScale),
    });
    expect(getByTestId('transaction-detail-skeleton-note')).toHaveStyle({
      minHeight: DETAIL_NOTE_MIN_HEIGHT,
    });
    const cell = resolveTransferSkeletonCellHeight(fontScale);
    expect(barsIn('transaction-detail-skeleton-transfer')).toEqual([cell, undefined, cell]);
  });

  it("MA-203: draws the rows card with the loaded rows card's corner and hairline border", async () => {
    const { getByTestId } = await render(
      <TransactionDetailSkeleton transaction={transferHint} actionSet="editDelete" />,
    );

    expect(getByTestId('transaction-detail-skeleton-rows')).toHaveStyle({
      borderRadius: Radius.detailCard,
      borderWidth: Size.hairline,
    });
  });

  it('draws one action bar where the loaded screen shows View commitment', async () => {
    const commitmentPayment: Transaction = {
      ...transferHint,
      id: 'payment-1',
      type: TransactionType.Expense,
      currency: Currency.EGP,
      exchange_rate: null,
      to_account_id: null,
      to_amount: null,
      category_id: 'category-1',
      budget_id: null,
      note: null,
      commitment_payment_id: 'commitment-payment-1',
    };
    const { getByTestId } = await render(
      <TransactionDetailSkeleton transaction={commitmentPayment} actionSet="viewCommitment" />,
    );

    expect(
      within(getByTestId('transaction-detail-skeleton-actions')).getAllByTestId(BAR).map(barHeight),
    ).toEqual([Size.ctaFooterTrack]);
  });
});
