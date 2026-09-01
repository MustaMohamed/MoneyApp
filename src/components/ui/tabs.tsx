import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, cn } from 'heroui-native';
import React from 'react';

import { Colors, Radius, Size } from '@/constants/theme';

import { type SegmentedTabsScrollAlign, useSegmentedTabsScroll } from './tabs.hook';

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
  animation?: 'disable-all';
  accessibilityLabel?: string;
  segmentWidth?: number;
  density?: SegmentedTabsDensity;
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
        // Avoid flex-1 inside ScrollView content.
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
          // In RN the style prop wins over className, so it overrides the selected label color.
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
      // `Tabs.Indicator` does not animate `backgroundColor`, so a style override is safe.
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
