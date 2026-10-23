import { PixelRatio } from 'react-native';

import { resolveDayHeaderGeometry } from '@/components/ui/day_header.geometry';
import {
  DETAIL_ROW_HEIGHT,
  DETAIL_ROW_LABEL_FONT_SIZE,
  DETAIL_ROW_VALUE_FONT_SIZE,
  resolveDetailRowHeight,
} from '@/components/ui/detail_row.geometry';
import {
  FILTER_AMOUNT_ERROR_SLOT_HEIGHT,
  resolveFilterAmountSlotStyle,
} from '@/components/ui/filter_accordion.geometry';
import { resolveSearchTallyGeometry } from '@/components/ui/search_tally.geometry';
import {
  STATUS_BADGE_PADDING_VERTICAL,
  STATUS_BADGE_XS_LABEL_FONT_SIZE,
  STATUS_BADGE_XS_PADDING_VERTICAL,
} from '@/components/ui/status_badge';
import { FITTED_LINE_SLACK, scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import {
  COMMITMENT_ROW_AMOUNT_FONT_SIZE,
  COMMITMENT_ROW_CAPTION_FONT_SIZE,
  COMMITMENT_ROW_LINE_GAP,
  COMMITMENT_ROW_TITLE_FONT_SIZE,
  resolveCommitmentRowHeight,
} from '@/modules/commitments/screens/commitments/components/commitment_row.helpers';
import {
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_LINE_GAP,
  TRANSACTION_ROW_TITLE_BADGE_CHROME,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
  resolveTransactionRowCaptionLines,
  resolveTransactionRowHeight,
} from '@/modules/transactions/components/transaction_row.helpers';
import {
  TRANSACTIONS_HERO_MAX_FONT_SCALE,
  resolveTransactionsHeroGeometry,
} from '@/modules/transactions/screens/transactions/components/transactions_text.geometry';
import {
  DETAIL_HERO_AMOUNT_MAX_FONT_SCALE,
  DETAIL_HERO_BADGE_GAP,
  DETAIL_HERO_CAPTION_GAP,
  DETAIL_HERO_OVERLINE_GAP,
  DETAIL_HERO_PADDING,
  DETAIL_TRANSFER_AMOUNT_FONT_SIZE,
  DETAIL_TRANSFER_LABEL_FONT_SIZE,
  DETAIL_TRANSFER_MIN_HEIGHT,
  DETAIL_TRANSFER_NAME_FONT_SIZE,
  resolveDetailHeroGeometry,
  resolveTransferCardHeight,
} from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';

// MA-237: the shared scaled line box and kept-space rule move nothing; each expectation is the resolver's formula at 82432e2e.
const FONT_SCALES = [0.85, 1, 1.3, 2] as const;

const line = (fontSize: number, fontScale: number, maxFontScale = Infinity): number =>
  lineHeightFor(scaledFontSize(fontSize, fontScale, maxFontScale));

function keptSpace(heightAtOne: number, lines: (fontScale: number) => number, s: number): number {
  return Math.max(heightAtOne, heightAtOne + lines(s) - lines(1));
}

function transactionTallerColumn(s: number): number {
  const title = Math.max(
    line(TRANSACTION_ROW_TITLE_FONT_SIZE, s),
    line(Type.compactBadge, s) + TRANSACTION_ROW_TITLE_BADGE_CHROME,
  );
  const content =
    title +
    resolveTransactionRowCaptionLines(s) *
      (TRANSACTION_ROW_LINE_GAP + line(TRANSACTION_ROW_CAPTION_FONT_SIZE, s));
  const value =
    line(TRANSACTION_ROW_AMOUNT_FONT_SIZE, s) +
    TRANSACTION_ROW_LINE_GAP +
    line(TRANSACTION_ROW_CODE_FONT_SIZE, s);
  return Math.max(content, value);
}

// The 82432e2e column: the amount alone set the value side, before the day indicator sat under it.
function commitmentTallerColumn(s: number): number {
  const name = Math.max(
    line(COMMITMENT_ROW_TITLE_FONT_SIZE, s),
    line(STATUS_BADGE_XS_LABEL_FONT_SIZE, s) + 2 * STATUS_BADGE_XS_PADDING_VERTICAL,
  );
  const content = name + COMMITMENT_ROW_LINE_GAP + line(COMMITMENT_ROW_CAPTION_FONT_SIZE, s);
  return Math.max(content, line(COMMITMENT_ROW_AMOUNT_FONT_SIZE, s));
}

function rowAroundColumn(tallerColumn: (fontScale: number) => number, s: number): number {
  return Math.max(
    TRANSACTION_ROW_HEIGHT,
    PixelRatio.roundToNearestPixel(TRANSACTION_ROW_HEIGHT + tallerColumn(s) - tallerColumn(1)),
  );
}

const SITES: Record<string, { resolve: (s: number) => unknown; expected: (s: number) => unknown }> =
  {
    'resolveFilterAmountSlotStyle(s).range': {
      resolve: (s) => resolveFilterAmountSlotStyle(s).range,
      expected: (s) =>
        s <= 1 ? { height: FILTER_AMOUNT_ERROR_SLOT_HEIGHT } : { minHeight: line(Type.micro, s) },
    },
    resolveSearchTallyGeometry: {
      resolve: resolveSearchTallyGeometry,
      expected: (s) => ({
        slotHeight: Spacing.xxs + line(Type.micro, s),
        lineHeight: line(Type.micro, s),
      }),
    },
    resolveDayHeaderGeometry: {
      resolve: resolveDayHeaderGeometry,
      expected: (s) => {
        const pillHeight = line(Type.caption, s) + 2 * Spacing.xxxs;
        return {
          fontSize: scaledFontSize(Type.caption, s),
          lineHeight: line(Type.caption, s),
          pillHeight,
          height: Spacing.md + pillHeight + Spacing.xs,
        };
      },
    },
    resolveDetailRowHeight: {
      resolve: resolveDetailRowHeight,
      expected: (s) =>
        keptSpace(
          DETAIL_ROW_HEIGHT,
          (f) => line(DETAIL_ROW_LABEL_FONT_SIZE, f) + line(DETAIL_ROW_VALUE_FONT_SIZE, f),
          s,
        ),
    },
    resolveTransactionsHeroGeometry: {
      resolve: resolveTransactionsHeroGeometry,
      expected: (s) => {
        const size = (fontSize: number) =>
          scaledFontSize(fontSize, s, TRANSACTIONS_HERO_MAX_FONT_SCALE);
        return {
          overline: size(Type.overline),
          hero: size(Type.hero),
          subhead: size(Type.subhead),
          micro: size(Type.micro),
          body: size(Type.body),
          chip: size(Type.chip),
          header: lineHeightFor(size(Type.overline)),
          amount: lineHeightFor(size(Type.hero)),
          columns: lineHeightFor(size(Type.micro)) + Spacing.xxxs + lineHeightFor(size(Type.body)),
          rail: Size.progressThin,
          caption: lineHeightFor(size(Type.chip)),
        };
      },
    },
    resolveTransferCardHeight: {
      resolve: resolveTransferCardHeight,
      expected: (s) =>
        keptSpace(
          DETAIL_TRANSFER_MIN_HEIGHT,
          (f) =>
            line(DETAIL_TRANSFER_LABEL_FONT_SIZE, f) +
            line(DETAIL_TRANSFER_NAME_FONT_SIZE, f) +
            line(DETAIL_TRANSFER_AMOUNT_FONT_SIZE, f),
          s,
        ),
    },
    resolveTransactionRowHeight: {
      resolve: resolveTransactionRowHeight,
      expected: (s) => rowAroundColumn(transactionTallerColumn, s),
    },
    resolveCommitmentRowHeight: {
      resolve: resolveCommitmentRowHeight,
      expected: (s) => rowAroundColumn(commitmentTallerColumn, s),
    },
  };

// The nine fields DetailHeroGeometry held at 82432e2e; fields added after it are not pinned here.
function detailHeroAt(s: number): Record<string, number> {
  const titleFontSize = scaledFontSize(Type.headline, s);
  const microFontSize = scaledFontSize(Type.micro, s);
  const amountFontSize = scaledFontSize(Type.detailHero, s, DETAIL_HERO_AMOUNT_MAX_FONT_SCALE);
  const badgeHeight = lineHeightFor(microFontSize) + 2 * STATUS_BADGE_PADDING_VERTICAL;
  const topHeight = Math.max(
    Size.detailHeroTile,
    lineHeightFor(titleFontSize) + DETAIL_HERO_BADGE_GAP + badgeHeight,
  );
  const amountHeight = lineHeightFor(amountFontSize) + FITTED_LINE_SLACK;
  return {
    titleFontSize,
    overlineFontSize: microFontSize,
    amountFontSize,
    codeFontSize: scaledFontSize(Type.subhead, s, DETAIL_HERO_AMOUNT_MAX_FONT_SCALE),
    captionFontSize: microFontSize,
    badgeHeight,
    topHeight,
    amountHeight,
    height:
      2 * DETAIL_HERO_PADDING +
      topHeight +
      DETAIL_HERO_OVERLINE_GAP +
      lineHeightFor(microFontSize) +
      amountHeight +
      DETAIL_HERO_CAPTION_GAP +
      lineHeightFor(microFontSize),
  };
}

const SITE_CASES = Object.entries(SITES).flatMap(([name, site]) =>
  FONT_SCALES.map((fontScale) => [name, fontScale, site] as const),
);

describe('MA-237 scaled line box sites hold their 82432e2e formulas', () => {
  it.each(SITE_CASES)('%s at font scale %s', (_name, fontScale, site) => {
    expect(site.resolve(fontScale)).toEqual(site.expected(fontScale));
  });

  it.each(FONT_SCALES)('resolveDetailHeroGeometry at font scale %s', (fontScale) => {
    expect(resolveDetailHeroGeometry(fontScale)).toMatchObject(detailHeroAt(fontScale));
  });
});
