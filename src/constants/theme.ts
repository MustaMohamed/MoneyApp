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
    warning: '#E8B130',
    dangerBg: 'rgba(224, 90, 66, 0.12)',
    warningBg: 'rgba(232, 177, 48, 0.12)',
    // `Colors.shared.cairoGold` + 13.3% alpha (`22` hex) — mockup.html:672,
    // `color-mix(in srgb, var(--cairo-gold) 13%)`, the same alpha the dashboard
    // hero's 24pt wallet chip used before this token existed. Eye-tuned for the
    // near-black dark bg; a real light theme would need to re-derive it, not
    // reuse this value (#253).
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
    // A named token for a colour with no theme meaning — routes a bare
    // 'transparent' string literal through constants/theme.ts the way every
    // other colour in this file already is (MA-009 post-approval fix F7).
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

/** Typography scale — font sizes only. Use FontFamily separately. */
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
  /** N1 headline — mockup § B, `.b-headline`, 42px. */
  display: msFont(42),
} as const;

/**
 * Derived line-height for a `Type` font size token. HeroUI `Typography` /
 * `Label.Text` keep their className's own line-height when a `style`
 * override sets `fontSize` alone — `style` only wins on the properties it
 * states — so every `fontSize` override anywhere in this codebase has to
 * pair an explicit `lineHeight` or the two drift apart (MA-009 impl review
 * D3: an 11px label-row mismatch from exactly this omission, found once the
 * pairing was missed by hand). `1.3` is the ratio the account-form module
 * had already converged on at 6 of its 8 hand-written sites before this
 * helper existed; centralising it here is what stops a second multiplier
 * (`* 1.35`, applied to the same `Type.caption` token in two other files)
 * from drifting in beside it undetected (debt:quality #229 / MA-009
 * post-approval fix F4). Not for `FieldMessageRail`'s own text, which pairs
 * a deliberately *unscaled* 20 against HeroUI `FieldError`'s own unscaled
 * CSS line-height (`account_form.geometry.ts`'s `FIELD_MESSAGE_TEXT_LINE_
 * HEIGHT`) — this ratio would break that equality off scale 1.0.
 */
const TYPE_LINE_HEIGHT_RATIO = 1.3;
export function lineHeightFor(fontSize: number): number {
  return Math.round(fontSize * TYPE_LINE_HEIGHT_RATIO);
}

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
  xs: ms(2),
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
  // future screen needs an accurate value, expose useBottomTabBarHeight() (from
  // 'expo-router/js-tabs' since SDK 56 — @react-navigation/bottom-tabs is no
  // longer a dependency) via context from a wrapper inside a <Tabs.Screen>.
  tabBarHeight: Platform.select({ ios: ms(49), default: ms(56) }),
  backBtn: ms(40),
  /** Compact brand mark — mockup § B header, `<svg width="30" height="30">`. */
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
  // Zero-shift contract — spec.md § "The zero-shift contract". These six are
  // fixed tracks that must not change height when their contents swap.
  fieldMessageTrack: ms(20), // helper <-> error rail under every field
  summaryValueSlot: ms(52), // N4 value slot, sized for Type.amountEntry (40)
  summaryCaptionSlot: ms(34), // N4 two-line caption
  summaryPillTrack: ms(24), // N4 pill row — ONE line
  statusTrack: ms(34), // footer footnote <-> error track
  progressRail: ms(55), // onboarding progress rail — bar + step label, fixed
  // Field height. UNSCALED, matching HeroUI Input's own `min-height: 48`
  // (heroui-native/src/styles/components/input.css:9 — spacing 0.25rem x 12).
  // Deliberately not ms()-scaled: see @sarah's ruling, note 5 below.
  fieldHeight: 48,
  // FieldMessageRail's own paddingTop, nudging its text down from the box's
  // top edge — not one of the five zero-shift tracks above (this pads
  // *inside* a track, it doesn't set one). ms(3) rounds back to 3 at every
  // scale this app clamps to ([0.85, 1.15] — Math.round(3 * 0.85) =
  // Math.round(3 * 1.15) = 3), so routing the old bare `3` through ms()
  // costs nothing visually (MA-009 post-approval fix F7).
  fieldRailTextInset: ms(3),
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
