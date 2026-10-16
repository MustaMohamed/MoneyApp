import { PixelRatio } from 'react-native';

import { STATUS_BADGE_PADDING_VERTICAL } from '@/components/ui/status_badge';
import { FITTED_LINE_SLACK, scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Currency, TransactionType } from '@/constants/enums';
import { Size, Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import {
  buildDetailSkeletonGeometry,
  DETAIL_HERO_AMOUNT_MAX_FONT_SCALE,
  DETAIL_HERO_BADGE_GAP,
  DETAIL_HERO_CAPTION_GAP,
  DETAIL_HERO_OVERLINE_GAP,
  DETAIL_HERO_PADDING,
  DETAIL_ROW_HEIGHT,
  DETAIL_ROW_LABEL_FONT_SIZE,
  DETAIL_ROW_VALUE_FONT_SIZE,
  DETAIL_TRANSFER_AMOUNT_FONT_SIZE,
  DETAIL_TRANSFER_LABEL_FONT_SIZE,
  DETAIL_TRANSFER_MIN_HEIGHT,
  DETAIL_TRANSFER_NAME_FONT_SIZE,
  resolveDetailAmountRowFigure,
  resolveDetailFactRowHeight,
  resolveDetailHeroGeometry,
  resolveDetailRowHeight,
  resolveTransferCardHeight,
  resolveTransferCellHeight,
  resolveTransferSkeletonCellHeight,
} from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';
import { makeTestTransaction } from '@/test_helpers/transaction';
import { ms } from '@/utils/responsive';

function lineBox(fontSize: number, fontScale: number): number {
  return lineHeightFor(scaledFontSize(fontSize, fontScale));
}

function rowLinesAt(fontScale: number): number {
  return (
    lineBox(DETAIL_ROW_LABEL_FONT_SIZE, fontScale) + lineBox(DETAIL_ROW_VALUE_FONT_SIZE, fontScale)
  );
}

function transferLinesAt(fontScale: number): number {
  return (
    lineBox(DETAIL_TRANSFER_LABEL_FONT_SIZE, fontScale) +
    lineBox(DETAIL_TRANSFER_NAME_FONT_SIZE, fontScale) +
    lineBox(DETAIL_TRANSFER_AMOUNT_FONT_SIZE, fontScale)
  );
}

// StatusBadge's padding above and below its label, which no font scale grows.
const HERO_BADGE_CHROME = 2 * STATUS_BADGE_PADDING_VERTICAL;

function heroBadgeAt(fontScale: number): number {
  return lineBox(Type.micro, fontScale) + HERO_BADGE_CHROME;
}

function heroTopAt(fontScale: number): number {
  return Math.max(
    Size.detailHeroTile,
    lineBox(Type.headline, fontScale) + DETAIL_HERO_BADGE_GAP + heroBadgeAt(fontScale),
  );
}

function heroAmountAt(fontScale: number): number {
  return (
    lineHeightFor(scaledFontSize(Type.detailHero, fontScale, DETAIL_HERO_AMOUNT_MAX_FONT_SCALE)) +
    FITTED_LINE_SLACK
  );
}

function heroHeightAt(fontScale: number): number {
  return (
    2 * DETAIL_HERO_PADDING +
    heroTopAt(fontScale) +
    DETAIL_HERO_OVERLINE_GAP +
    lineBox(Type.micro, fontScale) +
    heroAmountAt(fontScale) +
    DETAIL_HERO_CAPTION_GAP +
    lineBox(Type.micro, fontScale)
  );
}

describe('resolveDetailHeroGeometry', () => {
  it.each([0.85, 1, 1.3, 2, 3])(
    'sums padding, top row, overline, amount and caption at font scale %s',
    (fontScale) => {
      const geometry = resolveDetailHeroGeometry(fontScale);

      expect(geometry.badgeHeight).toBe(heroBadgeAt(fontScale));
      expect(geometry.topHeight).toBe(heroTopAt(fontScale));
      expect(geometry.topHeight).toBeGreaterThanOrEqual(Size.detailHeroTile);
      expect(geometry.amountHeight).toBe(heroAmountAt(fontScale));
      expect(geometry.height).toBe(heroHeightAt(fontScale));
    },
  );

  it.each([2, 3])(
    'holds the amount and its code at their 1.3 sizes at font scale %s',
    (fontScale) => {
      const capped = resolveDetailHeroGeometry(DETAIL_HERO_AMOUNT_MAX_FONT_SCALE);
      const geometry = resolveDetailHeroGeometry(fontScale);

      expect(geometry.amountFontSize).toBe(capped.amountFontSize);
      expect(geometry.codeFontSize).toBe(capped.codeFontSize);
    },
  );

  it('draws the amount at Type.detailHero at font scale 1', () => {
    expect(resolveDetailHeroGeometry(1).amountFontSize).toBe(Type.detailHero);
  });

  it('grows the title with no cap', () => {
    expect(resolveDetailHeroGeometry(2).titleFontSize).toBe(Type.headline * 2);
  });

  it('grows from 1.3 to 2 by the title, badge, overline and caption line boxes alone', () => {
    const growth = (fontSize: number): number => lineBox(fontSize, 2) - lineBox(fontSize, 1.3);

    expect(resolveDetailHeroGeometry(2).height - resolveDetailHeroGeometry(1.3).height).toBe(
      growth(Type.headline) + 3 * growth(Type.micro),
    );
  });
});

describe('resolveDetailRowHeight', () => {
  it.each([0.85, 1])('keeps the 1.0 row height at font scale %s', (fontScale) => {
    expect(resolveDetailRowHeight(fontScale)).toBe(DETAIL_ROW_HEIGHT);
  });

  it.each([2, 3])('adds the grown line boxes to the row at font scale %s', (fontScale) => {
    const row = resolveDetailRowHeight(fontScale);

    expect(row).toBe(DETAIL_ROW_HEIGHT + rowLinesAt(fontScale) - rowLinesAt(1));
    expect(row).toBeGreaterThan(DETAIL_ROW_HEIGHT);
  });
});

describe('resolveTransferCellHeight', () => {
  // The literal 48: the cell's 36 tile and its 6, 4 and 2 gaps, none of which scales with text.
  it.each([0.85, 1, 2, 3])(
    'is the three line boxes plus the 48 of tile and gaps at font scale %s',
    (fontScale) => {
      expect(resolveTransferCellHeight(fontScale)).toBe(transferLinesAt(fontScale) + 48);
    },
  );
});

describe('resolveTransferCardHeight', () => {
  it.each([0.85, 1])('keeps the 1.0 card height at font scale %s', (fontScale) => {
    expect(resolveTransferCardHeight(fontScale)).toBe(DETAIL_TRANSFER_MIN_HEIGHT);
  });

  it.each([2, 3])('adds the grown line boxes to the card at font scale %s', (fontScale) => {
    const card = resolveTransferCardHeight(fontScale);

    expect(card).toBe(DETAIL_TRANSFER_MIN_HEIGHT + transferLinesAt(fontScale) - transferLinesAt(1));
    expect(card).toBeGreaterThan(DETAIL_TRANSFER_MIN_HEIGHT);
  });

  it('keeps one space around the cell at font scales 1, 2 and 3', () => {
    const spaceAt1 = resolveTransferCardHeight(1) - resolveTransferCellHeight(1);

    expect(resolveTransferCardHeight(2) - resolveTransferCellHeight(2)).toBe(spaceAt1);
    expect(resolveTransferCardHeight(3) - resolveTransferCellHeight(3)).toBe(spaceAt1);
  });
});

describe('resolveTransferSkeletonCellHeight', () => {
  // The literal 80: the `h-20` cell, which the skeleton keeps at 1.0 and below.
  it.each([0.85, 1])('is the literal 80, the `h-20` cell, at font scale %s', (fontScale) => {
    expect(resolveTransferSkeletonCellHeight(fontScale)).toBe(80);
  });

  it.each([2, 3])('is as tall as the loaded cell at font scale %s', (fontScale) => {
    expect(resolveTransferSkeletonCellHeight(fontScale)).toBe(resolveTransferCellHeight(fontScale));
  });
});

describe('resolveDetailFactRowHeight (MA-181)', () => {
  // Frame C1 `.fact`: 8 above and below the taller of the 14/20 value line and the 20 account tile.
  function paddedLineAt(fontScale: number): number {
    return 2 * Spacing.xs + Math.max(lineBox(Type.body, fontScale), ms(20));
  }

  it.each([0.85, 1])('stands at the 44 touch floor at font scale %s', (fontScale) => {
    expect(resolveDetailFactRowHeight(fontScale)).toBe(
      PixelRatio.roundToNearestPixel(TouchSize.min),
    );
  });

  it.each([2, 3])(
    'is the padded value line in whole device pixels, above the touch floor, at font scale %s',
    (fontScale) => {
      const row = resolveDetailFactRowHeight(fontScale);

      expect(row).toBe(PixelRatio.roundToNearestPixel(paddedLineAt(fontScale)));
      expect(row).toBeGreaterThan(TouchSize.min);
    },
  );
});

describe('buildDetailSkeletonGeometry', () => {
  it('frame C10: gives a USD expense with a budget and a rate eight fact-row slots at 2.0, Account, Category, Budget, Amount in EGP, Rate, Date, Time and Source', () => {
    const transaction = makeTestTransaction({
      currency: Currency.USD,
      budget_id: 'budget-1',
      exchange_rate: 48.5,
    });
    const row = resolveDetailFactRowHeight(2);

    expect(buildDetailSkeletonGeometry(transaction, 2).rowHeights).toEqual([
      row,
      row,
      row,
      row,
      row,
      row,
      row,
      row,
    ]);
  });
});

describe('resolveDetailAmountRowFigure (MA-192)', () => {
  const RATE = 49;
  const usdExpense = makeTestTransaction({
    currency: Currency.USD,
    amount: 15,
    egp_amount: 735,
    exchange_rate: RATE,
  });
  const usdLeg = (type: TransactionType, toAmount: number) =>
    makeTestTransaction({
      type,
      currency: Currency.USD,
      amount: 100,
      egp_amount: 4_900,
      exchange_rate: RATE,
      to_account_id: 'account-2',
      to_amount: toAmount,
      category_id: null,
    });
  const egpLeg = (type: TransactionType, exchangeRate: number | null, toAmount: number | null) =>
    makeTestTransaction({
      type,
      currency: Currency.EGP,
      amount: 5_000,
      egp_amount: 5_000,
      exchange_rate: exchangeRate,
      to_account_id: 'account-2',
      to_amount: toAmount,
      category_id: null,
    });
  // A commitment's payment toward a USD commitment from an EGP account: a rate, no USD leg.
  const commitmentPayment = makeTestTransaction({
    currency: Currency.EGP,
    amount: 735,
    egp_amount: 735,
    exchange_rate: RATE,
    commitment_payment_id: 'payment-1',
  });

  it('gives a USD expense its EGP amount, with or without a stored rate', () => {
    expect(resolveDetailAmountRowFigure(usdExpense)).toEqual({
      amount: 735,
      currency: Currency.EGP,
    });
    expect(resolveDetailAmountRowFigure({ ...usdExpense, exchange_rate: null })).toEqual({
      amount: 735,
      currency: Currency.EGP,
    });
  });

  it.each([
    ['a transfer to EGP', TransactionType.Transfer, 4_900],
    ['a transfer to USD', TransactionType.Transfer, 100],
    ['a card payment to EGP', TransactionType.CCPayment, 4_900],
    ['a card payment to USD', TransactionType.CCPayment, 100],
  ])('gives USD 100 sent as %s its EGP amount', (_name, type, toAmount) => {
    expect(resolveDetailAmountRowFigure(usdLeg(type, toAmount))).toEqual({
      amount: 4_900,
      currency: Currency.EGP,
    });
  });

  it.each([
    ['a transfer', TransactionType.Transfer],
    ['a card payment', TransactionType.CCPayment],
  ])('gives EGP 5,000 sent as %s to USD what arrived, in USD', (_name, type) => {
    expect(resolveDetailAmountRowFigure(egpLeg(type, RATE, 102.04))).toEqual({
      amount: 102.04,
      currency: Currency.USD,
    });
  });

  it('gives no figure to an EGP transaction with no USD leg, and to a commitment payment', () => {
    expect({
      egpToEgpTransfer: resolveDetailAmountRowFigure(egpLeg(TransactionType.Transfer, null, 5_000)),
      egpExpense: resolveDetailAmountRowFigure(makeTestTransaction()),
      egpTransferWithNoArrival: resolveDetailAmountRowFigure(
        egpLeg(TransactionType.Transfer, RATE, null),
      ),
      commitmentPayment: resolveDetailAmountRowFigure(commitmentPayment),
    }).toEqual({
      egpToEgpTransfer: undefined,
      egpExpense: undefined,
      egpTransferWithNoArrival: undefined,
      commitmentPayment: undefined,
    });
  });

  it('frame C10: the skeleton holds five fact-row slots for an EGP to USD transfer with a rate, three for an EGP card payment and six for a commitment payment that stores a rate, at 2.0', () => {
    const slots = (count: number) =>
      Array.from({ length: count }, () => resolveDetailFactRowHeight(2));

    expect({
      transfer: buildDetailSkeletonGeometry(egpLeg(TransactionType.Transfer, RATE, 102.04), 2)
        .rowHeights,
      cardPayment: buildDetailSkeletonGeometry(egpLeg(TransactionType.CCPayment, null, 5_000), 2)
        .rowHeights,
      commitmentPayment: buildDetailSkeletonGeometry(commitmentPayment, 2).rowHeights,
    }).toEqual({ transfer: slots(5), cardPayment: slots(3), commitmentPayment: slots(6) });
  });
});
