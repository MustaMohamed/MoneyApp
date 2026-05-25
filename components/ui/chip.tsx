import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, cn } from 'heroui-native';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { GoldTokens } from '@/constants/theme_tokens';

export interface SelectablePillProps {
  /** Visible label text. */
  label: string;
  /** Selected (active) state — drives the gold-tint styling. */
  selected: boolean;
  onPress: () => void;
  /** Optional leading color dot (filter pills with a category/account color). */
  dotColor?: string;
  /** Show a trailing gold check when `selected` (multi-select filter pills). */
  checkable?: boolean;
  /** Block presses without changing appearance (e.g. locked commitment form). */
  disabled?: boolean;
  /** Accessibility label; defaults to `label`. */
  accessibilityLabel?: string;
  /** Layout passthrough (e.g. `{ flex: 1 }` for equal-width currency pills). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Canonical selectable pill. Wraps HeroUI `Chip`; HeroUI has no `selected`
 * boolean, so this owns the gold-tint selected/unselected styling. Purely
 * presentational — selection state lives in the parent.
 *
 * `animation="disable-all"` matches the prior plain-`Pressable` pills, which
 * had no press feedback.
 */
export function SelectablePill({
  label,
  selected,
  onPress,
  dotColor,
  checkable = false,
  disabled = false,
  accessibilityLabel,
  style,
}: SelectablePillProps): React.ReactElement {
  const hasAdornment = dotColor !== undefined || checkable;
  return (
    <Chip
      size="sm"
      variant="secondary"
      color="default"
      animation="disable-all"
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={style}
      className={cn(
        'rounded-full border',
        hasAdornment ? 'gap-1.5 px-2.5 py-1.5' : 'px-3 py-1',
        selected ? 'border-accent/50 bg-accent/15' : 'border-border bg-default/40',
      )}
    >
      {dotColor !== undefined ? (
        <View style={{ backgroundColor: dotColor }} className="h-2 w-2 rounded-full" />
      ) : null}
      <Chip.Label
        className={cn(
          'font-inter text-[11px]',
          selected ? 'text-accent font-semibold' : 'text-foreground/70 font-medium',
        )}
      >
        {label}
      </Chip.Label>
      {checkable && selected ? (
        <MaterialCommunityIcons name="check" size={12} color={GoldTokens[500]} />
      ) : null}
    </Chip>
  );
}
