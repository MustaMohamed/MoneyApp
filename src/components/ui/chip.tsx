import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, cn } from 'heroui-native';
import React from 'react';
import {
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';

import { resolveHeroPillGeometry, resolveSuccessChipGeometry } from '@/components/ui/chip.geometry';
import { resolveOneLineTextProps } from '@/components/ui/text_scale.geometry';
import { Colors, Radius, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

export interface SelectablePillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Leading adornment, drawn before the label. */
  startIcon?: React.ReactNode;
  /** Trailing adornment, drawn after the label. */
  endIcon?: React.ReactNode;
  checkable?: boolean;
  /** Forwarded to HeroUI `Chip`'s RN `Pressable` as `disabled`, not HeroUI's `isDisabled`. */
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  labelNumberOfLines?: number;
  hitSlop?: PressableProps['hitSlop'];
  onLayout?: PressableProps['onLayout'];
}

const SELECTABLE_PILL_CONTAINER_CLASS = {
  selected: 'border-accent/50 bg-accent/15',
  unselected: 'border-border bg-default/40',
} as const;

const SELECTABLE_PILL_LABEL_CLASS = {
  selected: 'text-accent font-inter-semibold',
  unselected: 'text-foreground/70 font-inter-medium',
} as const;

/** HeroUI `Chip` has no `selected` boolean, so this wrapper owns the gold-tint styling. */
export function SelectablePill({
  label,
  selected,
  onPress,
  startIcon,
  endIcon,
  checkable = false,
  disabled = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
  style,
  labelStyle,
  labelNumberOfLines,
  hitSlop,
  onLayout,
}: SelectablePillProps): React.ReactElement {
  const hasAdornment = startIcon !== undefined || endIcon !== undefined || checkable;
  return (
    <Chip
      testID={testID}
      size="sm"
      variant="secondary"
      color="default"
      animation="disable-all"
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      style={style}
      hitSlop={hitSlop}
      onLayout={onLayout}
      className={cn(
        'rounded-full border',
        hasAdornment ? 'gap-1.5 px-2.5 py-1.5' : 'px-3 py-1',
        selected
          ? SELECTABLE_PILL_CONTAINER_CLASS.selected
          : SELECTABLE_PILL_CONTAINER_CLASS.unselected,
      )}
    >
      {startIcon}
      <Chip.Label
        numberOfLines={labelNumberOfLines}
        className={
          selected ? SELECTABLE_PILL_LABEL_CLASS.selected : SELECTABLE_PILL_LABEL_CLASS.unselected
        }
        style={[{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }, labelStyle]}
      >
        {label}
      </Chip.Label>
      {checkable && selected ? (
        <MaterialCommunityIcons name="check" size={12} color={GoldTokens[500]} />
      ) : null}
      {endIcon}
    </Chip>
  );
}

/** mockup.html:633, `.badge-ok { gap: 6px }`. */
const SUCCESS_CHIP_GAP = ms(6);

/** mockup.html:639, `.badge-ok svg { width: 14px }`. */
const SUCCESS_CHIP_GLYPH = ms(14);

export interface SuccessChipProps {
  label: string;
  accessibilityLabel?: string;
}

/** `Chip` merges `style` after its size-variant classes, so geometry goes there, not in a class. */
export function SuccessChip({ label, accessibilityLabel }: SuccessChipProps): React.ReactElement {
  const geometry = resolveSuccessChipGeometry(useWindowDimensions().fontScale);

  return (
    <Chip
      variant="soft"
      color="success"
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        height: geometry.height,
        borderRadius: Radius.pill,
        paddingHorizontal: Spacing.sm,
        gap: SUCCESS_CHIP_GAP,
      }}
    >
      <MaterialCommunityIcons
        name="check-circle"
        size={SUCCESS_CHIP_GLYPH}
        color={Colors.dark.positive}
      />
      <Chip.Label {...resolveOneLineTextProps(geometry.label)} className="font-inter-semibold">
        {label}
      </Chip.Label>
    </Chip>
  );
}

/** mockup.html:702, `.hero-pill svg { width: 11px }`. */
const HERO_PILL_GLYPH = ms(11);

/** mockup.html:697-699, `.hero-pill`'s 4pt padding pair plus one caption line box. */
export const HERO_PILL_HEIGHT = Spacing.xxs * 2 + lineHeightFor(Type.caption);

/** mockup.html:696-701, `.hero-pill`; without the explicit `height` the row clips. */
export const HERO_PILL_STYLE: Readonly<ViewStyle> = Object.freeze({
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.xxs,
  paddingHorizontal: Spacing.xs,
  paddingVertical: Spacing.xxs,
  borderRadius: Radius.pill,
  backgroundColor: Colors.dark.overlayWhite7,
  height: HERO_PILL_HEIGHT,
});

export interface HeroPillProps {
  label: string;
  glyph: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

/** N4's hero-card pill, mockup.html:696-702, `.hero-pill`. */
export function HeroPill({ label, glyph }: HeroPillProps): React.ReactElement {
  const geometry = resolveHeroPillGeometry(useWindowDimensions().fontScale);

  return (
    <Chip
      variant="secondary"
      color="default"
      animation="disable-all"
      style={{ ...HERO_PILL_STYLE, height: geometry.height }}
    >
      <MaterialCommunityIcons name={glyph} size={HERO_PILL_GLYPH} color={CoreTokens.text1} />
      <Chip.Label
        {...resolveOneLineTextProps(geometry.label)}
        className="text-foreground font-inter"
      >
        {label}
      </Chip.Label>
    </Chip>
  );
}
