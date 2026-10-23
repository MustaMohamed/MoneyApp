import { resolveDayHeaderGeometry } from '@/components/ui/day_header.geometry';
import { resolveDetailRowHeight } from '@/components/ui/detail_row.geometry';
import { resolveFilterAmountSlotStyle } from '@/components/ui/filter_accordion.geometry';
import { resolveSearchFilterRowGeometry } from '@/components/ui/search_filter_row.geometry';
import { resolveSearchTallyGeometry } from '@/components/ui/search_tally.geometry';
import { resolveCommitmentRowHeight } from '@/modules/commitments/screens/commitments/components/commitment_row.helpers';
import { resolveTransactionRowHeight } from '@/modules/transactions/components/transaction_row.helpers';
import { resolveTransactionsHeroGeometry } from '@/modules/transactions/screens/transactions/components/transactions_text.geometry';
import {
  resolveDetailHeroGeometry,
  resolveTransferCardHeight,
} from '@/modules/transactions/screens/transactions/detail/components/detail.geometry';

// MA-237: the shared scaled line box and kept-space rule move nothing; every value is the resolver's output at 82432e2e.
const FONT_SCALES = [0.85, 1, 1.3, 2] as const;
type FontScale = (typeof FONT_SCALES)[number];

const SITES: Record<
  string,
  { resolve: (fontScale: number) => unknown; at: Record<FontScale, unknown> }
> = {
  'resolveFilterAmountSlotStyle(s).range': {
    resolve: (s) => resolveFilterAmountSlotStyle(s).range,
    at: {
      0.85: { height: 18 },
      1: { height: 18 },
      1.3: { minHeight: 21 },
      2: { minHeight: 33 },
    },
  },
  resolveSearchTallyGeometry: {
    resolve: resolveSearchTallyGeometry,
    at: {
      0.85: { slotHeight: 19, lineHeight: 14 },
      1: { slotHeight: 21, lineHeight: 16 },
      1.3: { slotHeight: 26, lineHeight: 21 },
      2: { slotHeight: 38, lineHeight: 33 },
    },
  },
  'resolveSearchFilterRowGeometry(s).badge': {
    resolve: (s) => resolveSearchFilterRowGeometry(s).badge,
    at: {
      0.85: { top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9 },
      1: { top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9 },
      1.3: { top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9 },
      2: { top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9 },
    },
  },
  resolveDayHeaderGeometry: {
    resolve: resolveDayHeaderGeometry,
    at: {
      0.85: { fontSize: 11.9, lineHeight: 15, pillHeight: 19, height: 46 },
      1: { fontSize: 14, lineHeight: 18, pillHeight: 22, height: 49 },
      1.3: { fontSize: 18.2, lineHeight: 24, pillHeight: 28, height: 55 },
      2: { fontSize: 28, lineHeight: 36, pillHeight: 40, height: 67 },
    },
  },
  resolveDetailRowHeight: {
    resolve: resolveDetailRowHeight,
    at: { 0.85: 67, 1: 67, 1.3: 76, 2: 101 },
  },
  resolveTransactionsHeroGeometry: {
    resolve: resolveTransactionsHeroGeometry,
    at: {
      0.85: {
        overline: 10.2,
        hero: 27.2,
        subhead: 15.725,
        micro: 10.625,
        body: 13.6,
        chip: 8.924999999999999,
        header: 13,
        amount: 35,
        columns: 34,
        rail: 3,
        caption: 12,
      },
      1: {
        overline: 12,
        hero: 32,
        subhead: 18.5,
        micro: 12.5,
        body: 16,
        chip: 10.5,
        header: 16,
        amount: 42,
        columns: 39,
        rail: 3,
        caption: 14,
      },
      1.3: {
        overline: 15.600000000000001,
        hero: 41.6,
        subhead: 24.05,
        micro: 16.25,
        body: 20.8,
        chip: 13.65,
        header: 20,
        amount: 54,
        columns: 50,
        rail: 3,
        caption: 18,
      },
      2: {
        overline: 15.600000000000001,
        hero: 41.6,
        subhead: 24.05,
        micro: 16.25,
        body: 20.8,
        chip: 13.65,
        header: 20,
        amount: 54,
        columns: 50,
        rail: 3,
        caption: 18,
      },
    },
  },
  resolveTransferCardHeight: {
    resolve: resolveTransferCardHeight,
    at: { 0.85: 145, 1: 145, 1.3: 160, 2: 194 },
  },
  resolveTransactionRowHeight: {
    resolve: resolveTransactionRowHeight,
    at: { 0.85: 69, 1: 69, 1.3: 104, 2: 144 },
  },
  resolveCommitmentRowHeight: {
    resolve: resolveCommitmentRowHeight,
    at: { 0.85: 69, 1: 69, 1.3: 81, 2: 109 },
  },
};

// The nine fields DetailHeroGeometry held at 82432e2e; fields added after it are not pinned here.
const DETAIL_HERO_AT: Record<FontScale, Record<string, number>> = {
  0.85: {
    titleFontSize: 21.675,
    overlineFontSize: 10.625,
    amountFontSize: 29.325,
    codeFontSize: 15.725,
    captionFontSize: 10.625,
    badgeHeight: 18,
    topHeight: 55,
    amountHeight: 38.5,
    height: 180.5,
  },
  1: {
    titleFontSize: 25.5,
    overlineFontSize: 12.5,
    amountFontSize: 34.5,
    codeFontSize: 18.5,
    captionFontSize: 12.5,
    badgeHeight: 20,
    topHeight: 58,
    amountHeight: 45.5,
    height: 194.5,
  },
  1.3: {
    titleFontSize: 33.15,
    overlineFontSize: 16.25,
    amountFontSize: 44.85,
    codeFontSize: 24.05,
    captionFontSize: 16.25,
    badgeHeight: 25,
    topHeight: 73,
    amountHeight: 58.5,
    height: 232.5,
  },
  2: {
    titleFontSize: 51,
    overlineFontSize: 25,
    amountFontSize: 44.85,
    codeFontSize: 24.05,
    captionFontSize: 25,
    badgeHeight: 37,
    topHeight: 108,
    amountHeight: 58.5,
    height: 291.5,
  },
};

const SITE_CASES = Object.entries(SITES).flatMap(([name, site]) =>
  FONT_SCALES.map((fontScale) => [name, fontScale, site] as const),
);

describe('MA-237 scaled line box sites hold their 82432e2e values', () => {
  it.each(SITE_CASES)('%s at font scale %s', (_name, fontScale, site) => {
    expect(site.resolve(fontScale)).toEqual(site.at[fontScale]);
  });

  it.each(FONT_SCALES)('resolveDetailHeroGeometry at font scale %s', (fontScale) => {
    expect(resolveDetailHeroGeometry(fontScale)).toMatchObject(DETAIL_HERO_AT[fontScale]);
  });
});
