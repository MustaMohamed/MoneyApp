import { Tabs, cn } from 'heroui-native';
import React from 'react';

import { Colors } from '@/constants/theme';

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
   * Scroll-alignment for `'scrollable'` layout — forwarded to `Tabs.ScrollView`.
   * @default 'center'
   */
  scrollAlign?: 'start' | 'center' | 'end' | 'none';
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
}: SegmentedTabsProps<T>): React.ReactElement {
  const isSolidGold = variant === 'solid-gold';
  const isScrollable = layout === 'scrollable';

  const triggers = segments.map((seg) => (
    <Tabs.Trigger
      key={seg.value}
      value={seg.value}
      // 'fixed' layout: each trigger takes an equal share of the list width.
      // 'scrollable' layout: triggers use intrinsic width — no flex-1.
      className={isScrollable ? undefined : 'flex-1'}
      accessibilityLabel={seg.accessibilityLabel ?? seg.label}
    >
      <Tabs.Label
        // solid-gold: override selected label to midnight-blue.
        // HeroUI's tv() applies text-segment-foreground/text-muted via
        // TriggerContext.isSelected — the style prop wins over className in RN.
        style={
          isSolidGold && value === seg.value ? { color: Colors.shared.midnightBlue } : undefined
        }
      >
        {seg.label}
      </Tabs.Label>
    </Tabs.Trigger>
  ));

  return (
    <Tabs
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- HeroUI onValueChange is (string)=>void; T extends string so the cast is sound
      onValueChange={onValueChange as (v: string) => void}
      value={value}
      variant="primary"
      animation={animation}
    >
      <Tabs.List className={cn(listClassName)} accessibilityLabel={accessibilityLabel}>
        <Tabs.Indicator
          // solid-gold: override bg-segment → cairoGold.
          // backgroundColor is NOT in the Reanimated-animated property set —
          // this style override is safe (see JSDoc above).
          style={isSolidGold ? { backgroundColor: Colors.shared.cairoGold } : undefined}
        />
        {isScrollable ? (
          <Tabs.ScrollView scrollAlign={scrollAlign}>{triggers}</Tabs.ScrollView>
        ) : (
          triggers
        )}
      </Tabs.List>
    </Tabs>
  );
}
