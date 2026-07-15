import { Platform } from 'react-native';

import { ms, msFont } from '@/utils/responsive';

/**
 * Design tokens for the Cairo Nights system.
 *
 * Numeric values (Spacing, Radius, Type, Size) are scaled responsively
 * from the iPhone 14 baseline (390pt). See utils/responsive.ts.
 *
 * See docs/design-system.md for the full reference + before/after table.
 */

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
    warning: '#D4830A',
    dangerBg: 'rgba(224, 90, 66, 0.12)',
    warningBg: 'rgba(212, 131, 10, 0.12)',
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
    // Budget 5-band colour scale (light analogues — tunable at device QA)
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
} as const;

/** Typography scale — font sizes only. Use FontFamily separately. */
export const Type = {
  chipMeta: msFont(7.5),
  chip: msFont(9),
  micro: msFont(11),
  detail: msFont(11.5),
  caption: msFont(12),
  meta: msFont(13),
  body: msFont(14),
  bodyStrong: msFont(15),
  subhead: msFont(16),
  title: msFont(18),
  headline: msFont(22),
  hero: msFont(28),
  summary: msFont(31),
} as const;

/** Tracking values for compact labels and eyebrow copy. */
export const LetterSpacing = {
  eyebrow: ms(0.3),
} as const;

/** Vertical / horizontal spacing scale. */
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

/** Border radius scale. */
export const Radius = {
  sm: ms(8),
  md: ms(12),
  lg: ms(16),
  xl: ms(28),
  pill: ms(11),
  cta: ms(13),
} as const;

/**
 * Component-level sizes (heights, icon containers, dot diameters, etc.).
 * Touch targets fall through to TouchSize so they don't shrink below
 * platform-recommended minimums.
 */
export const Size = {
  ctaHeight: ms(52),
  headerHeight: ms(56),
  // Bottom-tab-bar content height (excludes safe-area inset). iOS ~49pt, Android ~56dp.
  // Estimate only — does NOT track landscape collapse (~32pt on iOS) or scaled
  // tabBarLabelStyle (accessibility text sizes can push this past 56). The FAB
  // offset adds a 16dp gap on top so small overshoot is visually harmless. If a
  // future screen needs an accurate value, expose useBottomTabBarHeight() via
  // context from a wrapper component inside a <Tabs.Screen>.
  tabBarHeight: Platform.select({ ios: ms(49), default: ms(56) }),
  backBtn: ms(40),
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
  budgetNamedRing: ms(34),
  budgetRingStroke: ms(3),
  budgetCategoryRowHeight: ms(58),
  budgetNamedRowHeight: ms(44),
  budgetColdContentHeight: ms(320),
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
  progressDot: ms(4),
  checkCircle: ms(20),
  illustration: ms(120),
  sheetHandle: { width: ms(36), height: ms(4) },
  dialogButton: ms(44),
  hairline: ms(1),
} as const;

/**
 * Touch-target floor. Apple HIG recommends 44pt; Material 48dp. We pick
 * 44 as the cross-platform floor and never scale it below that.
 */
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
