import { PixelRatio } from 'react-native';

import { Radius } from '@/constants/theme';
import {
  DAY_CARD_BORDER_WIDTH,
  DAY_CARD_INNER_RADIUS,
  DAY_CARD_INSET,
  resolveDayCardSliceStyle,
  resolveDayCardSwipeCorners,
} from '@/modules/transactions/screens/transactions/components/day_card_row.helpers';
import { TRANSACTION_ROW_HEIGHT } from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';

describe('resolveDayCardSliceStyle', () => {
  const sides = {
    marginHorizontal: DAY_CARD_INSET,
    borderLeftWidth: DAY_CARD_BORDER_WIDTH,
    borderRightWidth: DAY_CARD_BORDER_WIDTH,
  };
  const top = {
    borderTopWidth: DAY_CARD_BORDER_WIDTH,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  };
  const bottom = {
    borderBottomWidth: DAY_CARD_BORDER_WIDTH,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  };

  it('closes the top of the card on the first row of a day', () => {
    expect(resolveDayCardSliceStyle(true, false)).toStrictEqual({ ...sides, ...top });
  });

  it('closes the bottom of the card on the last row of a day, one device pixel over the row above', () => {
    expect(resolveDayCardSliceStyle(false, true)).toStrictEqual({
      ...sides,
      ...bottom,
      marginTop: -1 / PixelRatio.get(),
    });
  });

  it('draws only the side borders on a middle row', () => {
    expect(resolveDayCardSliceStyle(false, false)).toStrictEqual(sides);
  });

  it('carries all four radii on a one-row day', () => {
    expect(resolveDayCardSliceStyle(true, true)).toStrictEqual({ ...sides, ...top, ...bottom });
  });

  it.each([
    [true, false],
    [false, true],
    [false, false],
    [true, true],
  ])('sets no overflow on the slice (isFirst %s, isLast %s)', (isFirst, isLast) => {
    expect(resolveDayCardSliceStyle(isFirst, isLast)).not.toHaveProperty('overflow');
  });
});

describe('resolveDayCardSwipeCorners', () => {
  it('rounds the top-right corner on the first row of a day', () => {
    expect(resolveDayCardSwipeCorners(true, false)).toStrictEqual({
      borderTopRightRadius: DAY_CARD_INNER_RADIUS,
    });
  });

  it('rounds the bottom-right corner on the last row of a day', () => {
    expect(resolveDayCardSwipeCorners(false, true)).toStrictEqual({
      borderBottomRightRadius: DAY_CARD_INNER_RADIUS,
    });
  });

  it('rounds both right corners on a one-row day', () => {
    expect(resolveDayCardSwipeCorners(true, true)).toStrictEqual({
      borderTopRightRadius: DAY_CARD_INNER_RADIUS,
      borderBottomRightRadius: DAY_CARD_INNER_RADIUS,
    });
  });

  it('leaves a middle row square', () => {
    expect(resolveDayCardSwipeCorners(false, false)).toStrictEqual({});
  });

  it('follows the card inside its border', () => {
    expect(DAY_CARD_INNER_RADIUS).toBe(Radius.lg - DAY_CARD_BORDER_WIDTH);
    expect(DAY_CARD_INNER_RADIUS).toBeGreaterThan(0);
  });
});

describe('day card slice geometry', () => {
  it.each([
    ['the inset', DAY_CARD_INSET],
    ['the border', DAY_CARD_BORDER_WIDTH],
    ['the row height', TRANSACTION_ROW_HEIGHT],
  ])('draws %s in whole device pixels', (_name, size) => {
    const pixels = size * PixelRatio.get();
    expect(pixels).toBeCloseTo(Math.round(pixels), 9);
  });
});
