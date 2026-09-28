import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, cn } from 'heroui-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { Colors, Radius, Size } from '@/constants/theme';

import { TABS_LIST_PADDING, resolveSegmentedTabsGeometry } from './tabs.geometry';
import { type SegmentedTabsScrollAlign, useSegmentedTabsScroll } from './tabs.hook';

// The form vocabulary is small radii — inputs and tiles sit at Radius.md — so the solid-gold track overrides HeroUI's pill `--radius-3xl` (user ruling 2026-09-01); the fill is concentric inside the list padding.
export const SOLID_GOLD_TRACK_RADIUS = Radius.md;
export const SOLID_GOLD_SELECTED_RADIUS = Math.max(SOLID_GOLD_TRACK_RADIUS - TABS_LIST_PADDING, 0);

export type SegmentedTabsCorners = 'pill' | 'form';

/** `track: undefined` leaves HeroUI's own pill radius standing; only the form corners override it. */
export function resolveSolidGoldRadii({
  isCompact,
  corners,
}: {
  isCompact: boolean;
  corners: SegmentedTabsCorners;
}): { track: number | undefined; selected: number } {
  return isCompact && corners === 'pill'
    ? { track: undefined, selected: Radius.lg }
    : { track: SOLID_GOLD_TRACK_RADIUS, selected: SOLID_GOLD_SELECTED_RADIUS };
}

export interface TabSegmentIcon {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}

export interface TabSegment<T extends string = string> {
  /** Value key passed to HeroUI Tabs; must be unique within the segment list. */
  value: T;
  label: string;
  /** Accessibility label for this trigger; defaults to `label`. */
  accessibilityLabel?: string;
  icon?: TabSegmentIcon;
}

export type SegmentedTabsVariant = 'default' | 'solid-gold';
export type SegmentedTabsDensity = 'default' | 'compact';

export interface SegmentedTabsProps<T extends string = string> {
  segments: TabSegment<T>[];
  /** Currently selected segment value; the caller owns the state. */
  value: T;
  onValueChange: (value: T) => void;
  variant?: SegmentedTabsVariant;
  layout?: 'fixed' | 'scrollable';
  /** Scroll alignment for `'scrollable'`; `'visible'` scrolls the least to reveal it. */
  scrollAlign?: SegmentedTabsScrollAlign;
  listClassName?: string;
  /** Merged into `Tabs.List`'s style, for a caller whose row height follows the font scale. */
  listStyle?: { height: number };
  animation?: 'disable-all';
  accessibilityLabel?: string;
  segmentWidth?: number;
  density?: SegmentedTabsDensity;
  /** `'form'` gives a compact solid-gold track the account form's corners instead of the pill. */
  corners?: SegmentedTabsCorners;
  /** Every trigger is non-interactive; the selected indicator still shows. */
  isDisabled?: boolean;
}

export function SegmentedTabs<T extends string>({
  segments,
  value,
  onValueChange,
  variant = 'default',
  layout = 'fixed',
  scrollAlign = 'center',
  listClassName,
  listStyle,
  animation,
  accessibilityLabel,
  segmentWidth,
  density = 'default',
  corners = 'pill',
  isDisabled,
}: SegmentedTabsProps<T>): React.ReactElement {
  const isSolidGold = variant === 'solid-gold';
  const isScrollable = layout === 'scrollable';
  const isCompact = density === 'compact';
  const radii = resolveSolidGoldRadii({ isCompact, corners });
  const geometry = resolveSegmentedTabsGeometry(useWindowDimensions().fontScale);
  const labelStyle = isCompact ? geometry.compact.label : geometry.defaultLabel;
  const scrollBehavior = useSegmentedTabsScroll({
    scrollAlign,
    value,
    segments,
    segmentWidth,
  });

  const triggers = segments.map((seg) => {
    const isSelected = value === seg.value;
    const selectedSolidGoldStyle =
      isSolidGold && isSelected
        ? {
            backgroundColor: Colors.shared.cairoGold,
            borderRadius: radii.selected,
          }
        : undefined;
    const sizeStyle =
      segmentWidth || isCompact
        ? {
            ...(segmentWidth ? { width: segmentWidth } : undefined),
            ...(isCompact ? { height: geometry.compact.triggerHeight } : undefined),
          }
        : undefined;
    const triggerStyle =
      sizeStyle && selectedSolidGoldStyle
        ? [sizeStyle, selectedSolidGoldStyle]
        : (sizeStyle ?? selectedSolidGoldStyle);

    return (
      <Tabs.Trigger
        key={seg.value}
        value={seg.value}
        // Avoid flex-1 inside ScrollView content.
        className={cn(
          isScrollable ? undefined : 'flex-1',
          isCompact ? 'gap-0.5 rounded-full px-1.5 py-0' : undefined,
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
          // In RN the style prop wins over className, so it overrides the label color.
          numberOfLines={1}
          allowFontScaling={labelStyle === undefined}
          adjustsFontSizeToFit={isCompact || segmentWidth != null}
          minimumFontScale={0.85}
          className={isCompact && isSelected ? 'font-inter-bold' : undefined}
          style={[
            labelStyle,
            isCompact || segmentWidth != null || labelStyle !== undefined
              ? { flexShrink: 1 }
              : undefined,
            isSolidGold && isSelected ? { color: Colors.shared.midnightBlue } : undefined,
            isCompact && !isSelected ? { color: Colors.dark.text2 } : undefined,
          ]}
        >
          {seg.label}
        </Tabs.Label>
      </Tabs.Trigger>
    );
  });

  const trackStyle =
    isSolidGold && radii.track !== undefined ? { borderRadius: radii.track } : undefined;

  const indicator = (
    <Tabs.Indicator
      // `Tabs.Indicator` does not animate `backgroundColor`, so a style override is safe.
      style={
        isSolidGold
          ? {
              backgroundColor: Colors.shared.cairoGold,
              borderRadius: radii.selected,
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
      <Tabs.List
        className={cn(listClassName)}
        style={listStyle || trackStyle ? { ...listStyle, ...trackStyle } : undefined}
        accessibilityLabel={accessibilityLabel}
      >
        {isScrollable ? (
          <Tabs.ScrollView
            ref={scrollBehavior.scrollViewRef}
            scrollAlign={scrollBehavior.heroUiScrollAlign}
            onScroll={scrollBehavior.onScroll}
            onLayout={scrollBehavior.onLayout}
            scrollEventThrottle={scrollBehavior.scrollEventThrottle}
            // The scroll view repeats the list's 3xl radius in its own CSS — keep it in step with the overridden track.
            style={trackStyle}
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
