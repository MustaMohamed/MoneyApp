import type { TextStyle, ViewStyle } from 'react-native';

import { HERO_PILL_HEIGHT, HERO_PILL_STYLE, HERO_PILL_TEXT_STYLE } from '@/components/ui/chip';
import { Currency } from '@/constants/enums';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { BROADSHEET_HEADLINE_TRACKING_EM } from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';
import type { ReadyFrame, ReadyPill } from '@/modules/onboarding/domain/ready_summary_state';
import {
  N4_BODY_TEXT_STYLE,
  N4_HEADLINE_LINE_HEIGHT_RATIO,
  N4_HEADLINE_TEXT_STYLE,
  N4_HERO_CAPTION_MAX_LINES,
  N4_HERO_CAPTION_SLOT_STYLE,
  N4_HERO_CAPTION_TEXT_STYLE,
  N4_HERO_CONTENT_STYLE,
  N4_HERO_CURRENCY_TEXT_STYLE,
  N4_HERO_FRAME_STYLE,
  N4_HERO_HEAD_STYLE,
  N4_HERO_LABEL_TEXT_STYLE,
  N4_HERO_PILL_ROW_STYLE,
  N4_HERO_REFUSAL_TEXT_STYLE,
  N4_HERO_VALUE_SLOT_STYLE,
  N4_HERO_VALUE_STEP_TEXT_STYLE,
  N4_HERO_VALUE_TEXT_STYLE,
  N4_SUMMARY_ROW_STYLE,
  N4_SUMMARY_ROW_TEXT_STYLE,
} from '@/modules/onboarding/screens/onboarding/ready/ready.geometry';
import {
  resolveCaption,
  resolveHeroAmountParts,
  resolveHeroValueA11yLabel,
  resolveHeroValueTextStyle,
  resolvePill,
} from '@/modules/onboarding/screens/onboarding/ready/ready.helpers';
import { formatCurrencyAmount } from '@/utils/format_amount';

// jest-expo mocks `Dimensions` at 750pt: `responsiveScale` clamps to 1.15 and tokens read larger.

// The eyebrow is absent because the shared `Eyebrow` component owns it and N4 adds no override.
const TEXT_STYLES: readonly (readonly [string, Readonly<TextStyle>, number])[] = [
  ['N4_BODY_TEXT_STYLE', N4_BODY_TEXT_STYLE, Type.body],
  ['N4_HERO_LABEL_TEXT_STYLE', N4_HERO_LABEL_TEXT_STYLE, Type.caption],
  ['N4_HERO_VALUE_TEXT_STYLE', N4_HERO_VALUE_TEXT_STYLE, Type.amountEntry],
  ['N4_HERO_VALUE_STEP_TEXT_STYLE', N4_HERO_VALUE_STEP_TEXT_STYLE, Type.hero],
  ['N4_HERO_CURRENCY_TEXT_STYLE', N4_HERO_CURRENCY_TEXT_STYLE, Type.subhead],
  ['N4_HERO_REFUSAL_TEXT_STYLE', N4_HERO_REFUSAL_TEXT_STYLE, Type.headline],
  ['N4_HERO_CAPTION_TEXT_STYLE', N4_HERO_CAPTION_TEXT_STYLE, Type.caption],
  ['N4_SUMMARY_ROW_TEXT_STYLE', N4_SUMMARY_ROW_TEXT_STYLE, Type.body],
  ['HERO_PILL_TEXT_STYLE', HERO_PILL_TEXT_STYLE, Type.caption],
];

const FROZEN_STYLES: readonly (readonly [string, Readonly<ViewStyle> | Readonly<TextStyle>])[] = [
  ['N4_HERO_FRAME_STYLE', N4_HERO_FRAME_STYLE],
  ['N4_HERO_CONTENT_STYLE', N4_HERO_CONTENT_STYLE],
  ['N4_HERO_HEAD_STYLE', N4_HERO_HEAD_STYLE],
  ['N4_HERO_VALUE_SLOT_STYLE', N4_HERO_VALUE_SLOT_STYLE],
  ['N4_HERO_CAPTION_SLOT_STYLE', N4_HERO_CAPTION_SLOT_STYLE],
  ['N4_HERO_PILL_ROW_STYLE', N4_HERO_PILL_ROW_STYLE],
  ['N4_SUMMARY_ROW_STYLE', N4_SUMMARY_ROW_STYLE],
  ['N4_HEADLINE_TEXT_STYLE', N4_HEADLINE_TEXT_STYLE],
  ...TEXT_STYLES.map(([name, style]) => [name, style] as const),
];

describe('N4 type — every fontSize override pairs a lineHeight', () => {
  it.each(TEXT_STYLES)('%s takes its Type token and the paired line height', (_n, style, token) => {
    expect(style.fontSize).toBe(token);
    expect(style.lineHeight).toBe(lineHeightFor(token));
  });

  // The 1.05 ratio is `.b-headline`'s own, from `mockup.html:410`.
  it('the headline pairs through the screen-local 1.05 ratio, which is locked', () => {
    expect(N4_HEADLINE_LINE_HEIGHT_RATIO).toBe(1.05);
    expect(N4_HEADLINE_TEXT_STYLE.fontSize).toBe(Type.hero);
    expect(N4_HEADLINE_TEXT_STYLE.lineHeight).toBe(
      Math.round(Type.hero * N4_HEADLINE_LINE_HEIGHT_RATIO),
    );
  });

  it('the headline tracking comes from the shared Broadsheet constant', () => {
    expect(N4_HEADLINE_TEXT_STYLE.letterSpacing).toBe(Type.hero * BROADSHEET_HEADLINE_TRACKING_EM);
  });
});

describe('N4 shared style constants are frozen', () => {
  // These styles are shared by reference, so one stray assignment would move every instance.
  it.each(FROZEN_STYLES)('%s', (_name, style) => {
    expect(Object.isFrozen(style)).toBe(true);
  });
});

describe('N4 zero-shift slots — fixed tracks, consumed unconditionally', () => {
  // Fixed heights, so the composed card height cannot depend on which frame is drawn.
  it('the value slot is a fixed token height that clips', () => {
    expect(N4_HERO_VALUE_SLOT_STYLE.height).toBe(Size.summaryValueSlot);
    expect(N4_HERO_VALUE_SLOT_STYLE.minHeight).toBeUndefined();
    expect(N4_HERO_VALUE_SLOT_STYLE.overflow).toBe('hidden');
  });

  it('the caption slot is a fixed token height that clips', () => {
    expect(N4_HERO_CAPTION_SLOT_STYLE.height).toBe(Size.summaryCaptionSlot);
    expect(N4_HERO_CAPTION_SLOT_STYLE.minHeight).toBeUndefined();
    expect(N4_HERO_CAPTION_SLOT_STYLE.overflow).toBe('hidden');
  });

  it('the caption slot holds exactly N4_HERO_CAPTION_MAX_LINES caption lines', () => {
    const captionLineHeight = lineHeightFor(Type.caption);
    expect(N4_HERO_CAPTION_MAX_LINES * captionLineHeight).toBeLessThanOrEqual(
      Size.summaryCaptionSlot,
    );
    expect((N4_HERO_CAPTION_MAX_LINES + 1) * captionLineHeight).toBeGreaterThan(
      Size.summaryCaptionSlot,
    );
  });

  it('the pill row is a fixed token track that clips rather than grows', () => {
    // `flexWrap` stays, but `height` plus `overflow` caps the track, so a third pill clips.
    expect(N4_HERO_PILL_ROW_STYLE.height).toBe(Size.summaryPillTrack);
    expect(N4_HERO_PILL_ROW_STYLE.minHeight).toBeUndefined();
    expect(N4_HERO_PILL_ROW_STYLE.overflow).toBe('hidden');
    expect(N4_HERO_PILL_ROW_STYLE.flexWrap).toBe('wrap');
  });

  it('the value slot carries exactly these keys — nothing added, nothing dropped', () => {
    expect(Object.keys(N4_HERO_VALUE_SLOT_STYLE).sort()).toEqual([
      'alignItems',
      'flexDirection',
      'gap',
      'height',
      'marginTop',
      'overflow',
    ]);
  });

  it('the caption slot carries exactly these keys', () => {
    expect(Object.keys(N4_HERO_CAPTION_SLOT_STYLE).sort()).toEqual([
      'height',
      'marginTop',
      'overflow',
    ]);
  });

  it('the pill row carries exactly these keys', () => {
    expect(Object.keys(N4_HERO_PILL_ROW_STYLE).sort()).toEqual([
      'alignItems',
      'flexDirection',
      'flexWrap',
      'gap',
      'height',
      'marginTop',
      'overflow',
    ]);
  });

  it('the summary row takes a minHeight, not a height — a wrapped label may grow it', () => {
    expect(N4_SUMMARY_ROW_STYLE.minHeight).toBe(Size.budgetNamedRowHeight);
    expect(N4_SUMMARY_ROW_STYLE.height).toBeUndefined();
  });
});

describe('N4 slot fit checks — the content each fixed track has to hold', () => {
  // `ms()` rounds independently, so these are fit checks, not equalities, and jest runs one scale.
  it('the value slot holds the 40px hero number', () => {
    expect(lineHeightFor(Type.amountEntry)).toBeLessThanOrEqual(Size.summaryValueSlot);
  });

  it('the value slot also holds the F3 refusal line at 22px, in the same box', () => {
    expect(lineHeightFor(Type.headline)).toBeLessThanOrEqual(Size.summaryValueSlot);
  });

  it('the caption slot holds two caption lines — what F7 needs', () => {
    expect(lineHeightFor(Type.caption) * 2).toBeLessThanOrEqual(Size.summaryCaptionSlot);
  });

  it('the pill fits the track it sits in', () => {
    // The pill's height is composed in `chip.tsx`, so this is a fit check, not an equality.
    expect(HERO_PILL_STYLE.height).toBe(HERO_PILL_HEIGHT);
    expect(HERO_PILL_HEIGHT).toBeLessThanOrEqual(Size.summaryPillTrack);
  });
});

describe('resolveHeroValueTextStyle — the step-down rung', () => {
  // The character count excludes the currency suffix, which renders as a separate node.
  it('keeps the full 40px size at 13 characters', () => {
    expect(resolveHeroValueTextStyle('-1,234,567.89').fontSize).toBe(Type.amountEntry);
  });

  it('steps down to 28px at 14 characters', () => {
    expect(resolveHeroValueTextStyle('-12,345,678.90').fontSize).toBe(Type.hero);
  });
});

describe('resolveHeroAmountParts — the explicit two decimals', () => {
  // `CURRENCY_CONFIG[EGP].decimals` is 0, so dropping the explicit 2 renders `148,250` here.
  it('renders EGP at two decimals despite the currency config saying zero', () => {
    expect(resolveHeroAmountParts(148250, Currency.EGP)).toEqual({
      value: '148,250.00',
      code: 'EGP',
    });
  });

  it('renders USD cents and its ISO code', () => {
    expect(resolveHeroAmountParts(2168.93, Currency.USD)).toEqual({
      value: '2,168.93',
      code: 'USD',
    });
  });

  it('renders a zero with both decimals', () => {
    expect(resolveHeroAmountParts(0, Currency.EGP)).toEqual({ value: '0.00', code: 'EGP' });
  });
});

describe('resolveHeroValueA11yLabel — one announcement, the same explicit decimals', () => {
  // Without the decimals argument this announces "148,250 EGP" over a screen showing "148,250.00".
  it('announces the amount and its code as one string, at two decimals', () => {
    expect(resolveHeroValueA11yLabel(148250, Currency.EGP)).toBe('148,250.00 EGP');
  });

  it('carries the sign the resolver produced, never a hand-written minus', () => {
    expect(resolveHeroValueA11yLabel(-8450, Currency.EGP)).toBe('-8,450.00 EGP');
  });

  // Tripwire: this is what the formatter does when decimals are left to `CURRENCY_CONFIG`.
  it('the currency config default really is zero decimals for EGP', () => {
    expect(formatCurrencyAmount(148250, Currency.EGP)).toBe('148,250 EGP');
  });
});

// Expected values are literals, never `Strings` lookups, which would restate the implementation.
// The two counts and the two codes are distinct in every row, so a swapped argument pair fails.
const CAPTION_ROWS: readonly (readonly [ReadyFrame, number, number, string, string, string])[] = [
  ['F1', 3, 0, 'EGP', 'USD', 'All 3 accounts are in EGP, so nothing needed converting.'],
  ['F2', 3, 1, 'EGP', 'USD', 'Includes 1 USD account, converted using your saved rate.'],
  ['F3', 3, 1, 'EGP', 'USD', 'Your accounts are saved. Set a rate in Settings and this fills in.'],
  [
    'F4',
    2,
    0,
    'EGP',
    'USD',
    'Your card balances are bigger than your cash and bank accounts right now.',
  ],
  ['F5', 2, 0, 'EGP', 'USD', 'What you have and what you owe cancel out exactly.'],
  [
    'F6',
    1,
    0,
    'EGP',
    'USD',
    'All of it in one account. You can add more from the dashboard whenever you like.',
  ],
  [
    'F7',
    1,
    0,
    'EGP',
    'USD',
    'Your only account is a credit card, so this is what you owe. Add a bank or cash account for the full picture.',
  ],
  // F7 covers any all-credit-card set, not only a single card.
  [
    'F7',
    2,
    0,
    'EGP',
    'USD',
    'Your accounts are all credit cards, so this is what you owe. Add a bank or cash account for the full picture.',
  ],
  // F2's foreign noun pluralises on `foreignCount`, not `accountCount`.
  ['F1', 2, 0, 'USD', 'EGP', 'All 2 accounts are in USD, so nothing needed converting.'],
  ['F2', 3, 2, 'USD', 'EGP', 'Includes 2 EGP accounts, converted using your saved rate.'],
];

describe('resolveCaption — every frame reaches its own copy', () => {
  it.each(CAPTION_ROWS)(
    '%s(%i accounts, %i foreign, base %s, foreign %s)',
    (frame, accountCount, foreignCount, baseCode, foreignCode, expected) => {
      expect(resolveCaption(frame, accountCount, foreignCount, baseCode, foreignCode)).toBe(
        expected,
      );
    },
  );

  it('the table covers all seven frames', () => {
    expect([...new Set(CAPTION_ROWS.map(([frame]) => frame))].sort()).toEqual([
      'F1',
      'F2',
      'F3',
      'F4',
      'F5',
      'F6',
      'F7',
    ]);
  });
});

const PILL_ROWS: readonly (readonly [string, ReadyPill, { label: string; glyph: string }])[] = [
  [
    'accounts, plural, bank glyph',
    { kind: 'accounts', count: 3, glyph: 'bank-outline' },
    { label: '3 accounts', glyph: 'bank-outline' },
  ],
  [
    // The glyph comes from the descriptor; this map may not re-derive it.
    'accounts, singular, credit-card glyph',
    { kind: 'accounts', count: 1, glyph: 'credit-card' },
    { label: '1 account', glyph: 'credit-card' },
  ],
  [
    'opening-balances',
    { kind: 'opening-balances', count: 2 },
    { label: 'opening balances', glyph: 'information-outline' },
  ],
  [
    'needs-rate counts the foreign accounts the descriptor carries',
    { kind: 'needs-rate', count: 1 },
    { label: '1 needs a rate', glyph: 'swap-horizontal' },
  ],
  [
    'rate, through the shortened formatter',
    { kind: 'rate', rate: 48.6 },
    { label: '48.60 EGP/USD', glyph: 'swap-horizontal' },
  ],
  [
    'approx, USD cents',
    { kind: 'approx', currency: Currency.USD, value: 2168.93 },
    { label: '2,168.93 USD', glyph: 'approximately-equal' },
  ],
  [
    // `CURRENCY_CONFIG[EGP].decimals` is 0, so dropping the explicit 2 renders `-4,860 EGP` here.
    'approx, EGP at the screen-local two decimals',
    { kind: 'approx', currency: Currency.EGP, value: -4860 },
    { label: '-4,860.00 EGP', glyph: 'approximately-equal' },
  ],
];

describe('resolvePill — every descriptor kind reaches its own copy and glyph', () => {
  it.each(PILL_ROWS)('%s', (_case, pill, expected) => {
    expect(resolvePill(pill)).toEqual(expected);
  });

  it('the table covers all five pill kinds', () => {
    expect([...new Set(PILL_ROWS.map(([, pill]) => pill.kind))].sort()).toEqual([
      'accounts',
      'approx',
      'needs-rate',
      'opening-balances',
      'rate',
    ]);
  });
});
