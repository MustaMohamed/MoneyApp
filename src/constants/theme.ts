import { Platform } from 'react-native';

import { ms, msFont } from '@/utils/responsive';

// Numeric tokens are scaled from the 390pt iPhone 14 baseline by `utils/responsive.ts`.

export const Colors = {
  dark: {
    bg: '#0F1923',
    surface: '#1A2535',
    surfaceEl: '#243044',
    border: '#2A3A4F',
    text1: '#F0EBE3',
    text2: '#6B7F99',
    text3: '#4A5568',
    gold: '#D4A44C',
    positive: '#4CAF82',
    negative: '#E05A42',
    warning: '#E8B130',
    dangerBg: 'rgba(224, 90, 66, 0.12)',
    warningBg: 'rgba(232, 177, 48, 0.12)',
    // `Colors.shared.cairoGold` at 13.3% alpha (`22` hex), mockup.html:672, tuned for the dark bg.
    goldTint: '#C9973A22',
    overlayWhite7: 'rgba(255, 255, 255, 0.07)',
    // Budget 5-band colour scale
    budgetUnder: '#6FA8DC',
    budgetSteady: '#4CAF82',
    budgetWatch: '#E0B341',
    budgetNear: '#E05A42',
    budgetOver: '#B23A28',
  },
  light: {
    bg: '#F7F4EF',
    surface: '#FFFFFF',
    surfaceEl: '#F0EBE3',
    border: '#E3DDD5',
    text1: '#1B2B4B',
    text2: '#8A8178',
    text3: '#C4BDB7',
    gold: '#C9973A',
    positive: '#3D7A5F',
    negative: '#C0442A',
    warning: '#B86E08',
    // Budget 5-band colour scale (light analogues)
    budgetUnder: '#4A86C0',
    budgetSteady: '#3A8F65',
    budgetWatch: '#B8922A',
    budgetNear: '#C04030',
    budgetOver: '#8F2818',
  },
  shared: {
    cairoGold: '#C9973A',
    midnightBlue: '#1B2B4B',
    transferBlue: '#4A7ABF',
    ccPlum: '#5A2D55',
    heroGrad1: '#1A2948',
    heroGrad2: '#223060',
    heroGrad3: '#192A4A',
    transparent: 'transparent',
  },
} as const;

export const FontFamily = {
  soraRegular: 'Sora_400Regular',
  soraSemi: 'Sora_600SemiBold',
  soraBold: 'Sora_700Bold',
  soraExtra: 'Sora_800ExtraBold',
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemi: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
} as const;

/** Font sizes only; families are in `FontFamily`. */
export const Type = {
  chipMeta: msFont(7.5),
  chip: msFont(9),
  compactBadge: msFont(9.5),
  overline: msFont(10.5),
  micro: msFont(11),
  detail: msFont(11.5),
  caption: msFont(12),
  meta: msFont(13),
  body: msFont(14),
  bodyStrong: msFont(15),
  subhead: msFont(16),
  emptyTitle: msFont(17),
  title: msFont(18),
  headline: msFont(22),
  hero: msFont(28),
  summary: msFont(31),
  detailHero: msFont(30),
  amountEntry: msFont(40),
  /** N1 headline, mockup § B, `.b-headline`, 42px. */
  display: msFont(42),
} as const;

// A `style` `fontSize` override keeps the className's line-height, so always pair `lineHeightFor`.
const TYPE_LINE_HEIGHT_RATIO = 1.3;
export function lineHeightFor(fontSize: number): number {
  return Math.round(fontSize * TYPE_LINE_HEIGHT_RATIO);
}

export const LetterSpacing = {
  eyebrow: ms(0.3),
} as const;

export const Spacing = {
  xxxxs: ms(1),
  xxxs: ms(2),
  xxs: ms(4),
  xs: ms(8),
  sm: ms(12),
  md: ms(16),
  lg: ms(20),
  xl: ms(24),
  xxl: ms(32),
} as const;

export const Radius = {
  xs: ms(2),
  sm: ms(8),
  md: ms(12),
  lg: ms(16),
  xl: ms(28),
  pill: ms(11),
  cta: ms(13),
} as const;

/** Touch targets use `TouchSize` instead, so they never fall below the platform floor. */
export const Size = {
  ctaHeight: ms(52),
  // Onboarding footer CTA slot. Raw 48, never ms(): it must equal HeroUI's
  // own .button__root--size-md height (--spacing × 12 = 48dp, CSS px that do
  // not width-scale), so the slot hugs the button at every device scale.
  // Footer compaction 2026-09-01 — spec.md § Known disagreements item 6.
  onboardingCtaTrack: 48,
  headerHeight: ms(56),
  // Estimate excluding the safe-area inset; ignores landscape collapse and scaled tab labels.
  tabBarHeight: Platform.select({ ios: ms(49), default: ms(56) }),
  backBtn: ms(40),
  /** Compact brand mark, mockup § B header, `<svg width="30" height="30">`. */
  logoMark: ms(30),
  compactChipHeight: ms(28),
  spendingPlanChipHeight: ms(25),
  spendingPlanProgressTrack: ms(4),
  spendingPlanStatusHeight: ms(18),
  spendingPlanDetailRing: ms(28),
  spendingPlanDetailRowHeight: ms(46),
  spendingPlanFlexibleRowHeight: ms(39),
  budgetToolHeight: ms(38),
  budgetActionMenuWidth: ms(132),
  budgetCategoryColumn: ms(46),
  budgetCategoryRing: ms(42),
  budgetRuleValueColumn: ms(72),
  budgetRuleChevronColumn: ms(18),
  budgetRuleRowMinHeight: ms(62),
  budgetNamedRing: ms(34),
  budgetRingStroke: ms(3),
  listRowHeight: ms(58),
  budgetNamedRowHeight: ms(44),
  budgetColdContentHeight: ms(320),
  budgetCopyPreviewRowHeight: ms(54),
  statusRailMinHeight: ms(64),
  plansEmptyMinHeight: ms(300),
  plansEmptyIcon: ms(72),
  plansEmptyTextWidth: ms(280),
  compactBodyLineHeight: ms(20),
  iconMicro: ms(12),
  iconBack: ms(20),
  iconXs: ms(16),
  iconSm: ms(18),
  iconMd: ms(22),
  iconLg: ms(26),
  /** Same ms(30) as `logoMark` by design; icon vocabulary, not the brand mark. Do not dedupe. */
  iconXl: ms(30),
  emptyStateIcon: ms(56),
  iconHero: ms(64),
  filterSegmentWidth: ms(96),
  filterSegmentCompactWidth: ms(72),
  filterSegmentIcon: ms(14),
  typeIconBox: ms(36),
  securityIconBox: ms(40),
  flagBox: ms(36),
  shieldBox: ms(48),
  colorDot: ms(20),
  progressTrack: ms(8),
  progressThin: ms(3),
  progressDot: ms(4),
  checkCircle: ms(20),
  sheetHandle: { width: ms(36), height: ms(4) },
  dialogButton: ms(44),
  hairline: ms(1),
  // Fixed tracks that must not change height when their contents swap.
  fieldMessageTrack: ms(20), // helper <-> error rail under every field
  summaryValueSlot: ms(52), // N4 value slot, sized for `Type.amountEntry` (40)
  summaryCaptionSlot: ms(34), // N4 two-line caption
  summaryPillTrack: ms(24), // N4 pill row, one line
  statusTrack: ms(34), // footer footnote <-> error track — error-state max; idle hugs one line (2026-09-01 compaction)
  progressRail: ms(55), // onboarding progress rail, bar plus step label
  // Unscaled, to match HeroUI Input's own `min-height: 48`.
  fieldHeight: 48,
  // Padding inside `FieldMessageRail`, not one of the fixed tracks above.
  fieldRailTextInset: ms(3),
} as const;

/** Cross-platform floor of 44: Apple HIG recommends 44pt, Material 48dp. Never scaled. */
export const TouchSize = {
  min: 44,
} as const;

export const AccountColors = [
  '#1B2B4B',
  '#C9973A',
  '#3D7A5F',
  '#C0442A',
  '#4A2545',
  '#185FA5',
  '#D4830A',
  '#2D7D6E',
  '#7B3F8C',
  '#C45C2A',
  '#4A6FA5',
  '#7A8B3C',
] as const;
