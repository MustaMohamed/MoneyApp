import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, cn } from 'heroui-native';
import React from 'react';

import { Colors, Radius, Size } from '@/constants/theme';

import { type SegmentedTabsScrollAlign, useSegmentedTabsScroll } from './tabs.hook';

export interface TabSegmentIcon {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}

/**
 * Descriptor for a single segment in a `SegmentedTabs` control.
 *
 * Generic `T extends string` lets call-sites bind to a concrete enum/union
 * (e.g. `TabSegment<Currency>`, `TabSegment<CategoryType>`) so that
 * `onValueChange` is fully type-safe.
 */
export interface TabSegment<T extends string = string> {
  /** Value key passed to HeroUI Tabs — must be unique within the segment list. */
  value: T;
  /** Visible label text — rendered byte-identical; no transformation applied. */
  label: string;
  /** Accessibility label for this trigger; defaults to `label`. */
  accessibilityLabel?: string;
  /** Optional leading icon for compact filters. */
  icon?: TabSegmentIcon;
}

/**
 * Visual appearance of the selected indicator.
 *
 * - `'default'`    — HeroUI primary look: `bg-default` pill container,
 *                    `bg-segment` animated indicator (theme-driven).
 * - `'solid-gold'` — Cairo Nights gold indicator fill (`Colors.shared.cairoGold`)
 *                    with midnight-blue selected label. Used by the Expense/Income
 *                    category switcher and EGP/USD currency pickers.
 */
export type SegmentedTabsVariant = 'default' | 'solid-gold';
export type SegmentedTabsDensity = 'default' | 'compact';

export interface SegmentedTabsProps<T extends string = string> {
  /**
   * Ordered list of segments. Label strings are passed through unchanged.
   */
  segments: TabSegment<T>[];
  /** Currently selected segment value — caller owns state. */
  value: T;
  /** Called when a trigger is pressed with the new value. */
  onValueChange: (value: T) => void;
  /**
   * Visual variant.
   * @default 'default'
   */
  variant?: SegmentedTabsVariant;
  /**
   * Layout mode.
   * - `'fixed'`      — triggers share full width equally (`flex-1` per trigger).
   *                    Use for 2–4 segments in a bounded container.
   * - `'scrollable'` — triggers use intrinsic width inside a horizontal
   *                    ScrollView. Selected trigger is auto-scrolled to center.
   *                    Use for variable-count or many-segment strips (e.g. month
   *                    navigator).
   * @default 'fixed'
   */
  layout?: 'fixed' | 'scrollable';
  /**
   * Scroll-alignment for `'scrollable'` layout. `'visible'` keeps the selected
   * fixed-width segment fully visible with the smallest needed scroll.
   * @default 'center'
   */
  scrollAlign?: SegmentedTabsScrollAlign;
  /**
   * Extra className forwarded to `Tabs.List` (e.g. margin, width overrides).
   * Appended after the default list classes — Tailwind specificity rules apply.
   */
  listClassName?: string;
  /**
   * Forward to HeroUI `Tabs` `animation` prop.
   * Pass `'disable-all'` to suppress the spring indicator animation, matching
   * the prior plain-Pressable surfaces that had no press feedback.
   * @default undefined — HeroUI default spring animation
   */
  animation?: 'disable-all';
  /**
   * `aria-label` / `accessibilityLabel` on the `Tabs.List` (tablist element).
   * Provide when the surrounding UI does not make the control's purpose obvious.
   */
  accessibilityLabel?: string;
  /**
   * Fixed width for each segment. Useful in scrollable rails where every item
   * should occupy the same visual space.
   */
  segmentWidth?: number;
  /**
   * Visual density for segment triggers.
   * @default 'default'
   */
  density?: SegmentedTabsDensity;
  /**
   * When true, all triggers are non-interactive — used for locked form fields.
   * Selected indicator still shows.
   */
  isDisabled?: boolean;
}

/**
 * Canonical segmented control wrapper over HeroUI Native `Tabs`.
 *
 * Purely presentational — props in, `onValueChange` out. Selection state lives
 * in the caller. Replaces bespoke `Pressable`-row segmented controls across the
 * app (SP-4, Wave 4).
 *
 * ## Solid-gold variant
 * `Tabs.Indicator` background-color is NOT in the Reanimated-animated property
 * set (only width/height/translateX/opacity are animated). Overriding it via
 * `style={{ backgroundColor: Colors.shared.cairoGold }}` is therefore safe.
 * Selected label text uses a per-trigger `style` override to midnight-blue
 * (`Colors.shared.midnightBlue`), determined by comparing `value === seg.value`
 * in the render map.
 *
 * ## Fallback (contingency — only if bg-color override fails at runtime)
 * If Unistyles className resolution causes `bg-segment` to win over the style
 * prop (unexpected, but possible in edge cases), set
 * `isAnimatedStyleActive={false}` on `Tabs.Indicator` and provide the full
 * position + background via a static `style` prop. This removes the spring
 * slide animation but keeps HeroUI Tabs as the substrate. Document the decision
 * in the PR description if the fallback is invoked.
 * NOTE: `useTabsIndicatorAnimation` is NOT exported from heroui-native and
 * cannot be used externally — the fallback is a static style only.
 */
export function SegmentedTabs<T extends string>({
  segments,
  value,
  onValueChange,
  variant = 'default',
  layout = 'fixed',
  scrollAlign = 'center',
  listClassName,
  animation,
  accessibilityLabel,
  segmentWidth,
  density = 'default',
  isDisabled,
}: SegmentedTabsProps<T>): React.ReactElement {
  const isSolidGold = variant === 'solid-gold';
  const isScrollable = layout === 'scrollable';
  const isCompact = density === 'compact';
  const scrollBehavior = useSegmentedTabsScroll({
    scrollAlign,
    value,
    segments,
    segmentWidth,
  });

  const triggers = segments.map((seg) => {
    const isSelected = value === seg.value;
    const selectedRadius = isCompact ? Radius.lg : Radius.pill;
    const selectedSolidGoldStyle =
      isSolidGold && isSelected
        ? { backgroundColor: Colors.shared.cairoGold, borderRadius: selectedRadius }
        : undefined;
    const triggerStyle =
      segmentWidth && selectedSolidGoldStyle
        ? [{ width: segmentWidth }, selectedSolidGoldStyle]
        : segmentWidth
          ? { width: segmentWidth }
          : selectedSolidGoldStyle;

    return (
      <Tabs.Trigger
        key={seg.value}
        value={seg.value}
        // Fixed tabs share width; scrollable tabs use either segmentWidth or
        // intrinsic width. Avoid flex-1 inside ScrollView content.
        className={cn(
          isScrollable ? undefined : 'flex-1',
          isCompact ? 'h-7 gap-0.5 rounded-full px-1.5 py-0' : undefined,
        )}
        style={triggerStyle}
        accessibilityLabel={seg.accessibilityLabel ?? seg.label}
        isDisabled={isDisabled}
      >
        {seg.icon ? (
          <MaterialCommunityIcons
            name={seg.icon.name}
            size={isCompact ? Size.filterSegmentIcon : Size.iconXs}
            color={isSolidGold && isSelected ? Colors.shared.midnightBlue : seg.icon.color}
          />
        ) : null}
        <Tabs.Label
          // solid-gold: override selected label to midnight-blue.
          // HeroUI's tv() applies text-segment-foreground/text-muted via
          // TriggerContext.isSelected — the style prop wins over className in RN.
          numberOfLines={1}
          adjustsFontSizeToFit={isCompact || segmentWidth != null}
          minimumFontScale={0.85}
          className={
            isCompact ? (isSelected ? 'font-inter-bold text-[11px]' : 'text-[11px]') : undefined
          }
          style={[
            isCompact || segmentWidth != null ? { flexShrink: 1 } : undefined,
            isSolidGold && isSelected ? { color: Colors.shared.midnightBlue } : undefined,
          ]}
        >
          {seg.label}
        </Tabs.Label>
      </Tabs.Trigger>
    );
  });

  const indicator = (
    <Tabs.Indicator
      // solid-gold: override bg-segment → cairoGold.
      // backgroundColor is not animated, so this style override is safe.
      style={
        isSolidGold
          ? {
              backgroundColor: Colors.shared.cairoGold,
              borderRadius: isCompact ? Radius.lg : Radius.pill,
            }
          : undefined
      }
    />
  );

  return (
    <Tabs
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- HeroUI onValueChange is (string)=>void; T extends string so the cast is sound
      onValueChange={onValueChange as (v: string) => void}
      value={value}
      variant="primary"
      animation={animation}
    >
      <Tabs.List className={cn(listClassName)} accessibilityLabel={accessibilityLabel}>
        {isScrollable ? (
          <Tabs.ScrollView
            ref={scrollBehavior.scrollViewRef}
            scrollAlign={scrollBehavior.heroUiScrollAlign}
            onScroll={scrollBehavior.onScroll}
            onLayout={scrollBehavior.onLayout}
            scrollEventThrottle={scrollBehavior.scrollEventThrottle}
          >
            {indicator}
            {triggers}
          </Tabs.ScrollView>
        ) : (
          <>
            {indicator}
            {triggers}
          </>
        )}
      </Tabs.List>
    </Tabs>
  );
}
