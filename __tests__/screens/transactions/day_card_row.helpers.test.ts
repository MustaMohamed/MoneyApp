import { PixelRatio, Platform } from 'react-native';

import { Radius } from '@/constants/theme';
import {
  DAY_CARD_BORDER_WIDTH,
  DAY_CARD_INNER_RADIUS,
  DAY_CARD_INSET,
  resolveDayCardSliceStyle,
  resolveDayCardSwipeCorners,
} from '@/modules/transactions/screens/transactions/components/day_card_row.helpers';

const PIXEL_2_DENSITY = 2.625;

interface LoadedDayCard {
  inset: number;
  border: number;
  rowHeight: number;
  resolveDayCardSliceStyle: typeof resolveDayCardSliceStyle;
}

// The constants compute at module load, so each platform and density loads a fresh copy after its mock.
function loadDayCard(os: 'android' | 'ios', density: number): LoadedDayCard {
  let loaded: LoadedDayCard | undefined;
  jest.isolateModules(() => {
    const isolated = jest.requireActual<{
      Platform: typeof Platform;
      PixelRatio: typeof PixelRatio;
    }>('react-native');
    jest.replaceProperty(isolated.Platform, 'OS', os);
    jest.spyOn(isolated.PixelRatio, 'get').mockReturnValue(density);
    const card = jest.requireActual<{
      DAY_CARD_INSET: number;
      DAY_CARD_BORDER_WIDTH: number;
      resolveDayCardSliceStyle: typeof resolveDayCardSliceStyle;
    }>('@/modules/transactions/screens/transactions/components/day_card_row.helpers');
    const row = jest.requireActual<{ TRANSACTION_ROW_HEIGHT: number }>(
      '@/modules/transactions/screens/transactions/components/transaction_row.helpers',
    );
    loaded = {
      inset: card.DAY_CARD_INSET,
      border: card.DAY_CARD_BORDER_WIDTH,
      rowHeight: row.TRANSACTION_ROW_HEIGHT,
      resolveDayCardSliceStyle: card.resolveDayCardSliceStyle,
    };
  });
  if (loaded === undefined) throw new Error('day card helpers did not load');
  return loaded;
}

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

  it('closes the bottom of the card on the last row of a day (jest-expo runs iOS)', () => {
    expect(resolveDayCardSliceStyle(false, true)).toStrictEqual({ ...sides, ...bottom });
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

describe('the last slice per platform', () => {
  it('overlaps the slice above by one device pixel on Android', () => {
    const android = loadDayCard('android', PIXEL_2_DENSITY);

    expect(android.resolveDayCardSliceStyle(false, true)).toHaveProperty(
      'marginTop',
      -1 / PIXEL_2_DENSITY,
    );
    expect(android.resolveDayCardSliceStyle(false, false)).not.toHaveProperty('marginTop');
  });

  it('does not overlap on iOS, where the fill offset is unmeasured', () => {
    const ios = loadDayCard('ios', PIXEL_2_DENSITY);

    expect(ios.resolveDayCardSliceStyle(false, true)).not.toHaveProperty('marginTop');
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

describe('day card slice geometry at the Pixel_2 density', () => {
  it.each([
    ['the inset', 'inset'],
    ['the border', 'border'],
    ['the row height', 'rowHeight'],
  ] as const)('draws %s in whole device pixels', (_name, key) => {
    const pixels = loadDayCard('android', PIXEL_2_DENSITY)[key] * PIXEL_2_DENSITY;

    expect(pixels).toBeCloseTo(Math.round(pixels), 9);
  });
});
