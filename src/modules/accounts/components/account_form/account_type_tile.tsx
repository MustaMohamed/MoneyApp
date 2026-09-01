import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { RadioGroup, Typography, cn } from 'heroui-native';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { HeroGlow } from '@/components/ui/hero_glow';
import {
  HERO_GRADIENT_COLORS,
  HERO_GRADIENT_END,
  HERO_GRADIENT_START,
} from '@/components/ui/hero_gradient';
import { Colors, Radius, Size, Spacing, Type, lineHeightFor, withAlpha } from '@/constants/theme';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

import type { TypeOption } from '../account_type_pill';
import { useAccountTypeTileAnim } from './account_form.anim';
import { ACCOUNT_TYPE_TILE_HEIGHT } from './account_form.geometry';

export interface AccountTypeTileProps {
  option: TypeOption;
  /** From the selector's own watch — the container border can't reach the render-prop `isSelected`. */
  isSelected: boolean;
}

/** HeroUI's `.radio-group__item` is row/space-between and `style` beats `className` in RN. */
const TILE_BOX_STYLE: ViewStyle = {
  flex: 1,
  height: ACCOUNT_TYPE_TILE_HEIGHT,
  borderWidth: 1,
  borderRadius: Radius.md,
  overflow: 'hidden',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',
  gap: Spacing.xs,
  padding: Spacing.xs,
};

// Colour only, never layout: `.radio-group__item` supplies neither border colour nor fill, leaving RN's default black border (mockup `.tile`/`.tile.on`, mockup.html:497,509).
const TILE_UNSELECTED_COLORS: ViewStyle = {
  borderColor: Colors.dark.border,
  backgroundColor: Colors.dark.surface,
};
const TILE_SELECTED_COLORS: ViewStyle = {
  // gold-400 at 46% — mockup's `color-mix(... 46%, transparent)` as an alpha suffix.
  borderColor: withAlpha(GoldTokens[400], '75'),
  backgroundColor: Colors.dark.surface,
};

// Glow geometry — mockup `.tile.on::before` (74x74 at -22/-22); the fade itself lives in HeroGlow.
const GLOW_SIZE = ms(74);
const GLOW_OFFSET = ms(22);

/** The gradient and glow must be direct siblings, not children of the scaling `Animated.View`. */
export function AccountTypeTile({ option, isSelected }: AccountTypeTileProps) {
  const { tileAnim, triggerTileTap } = useAccountTypeTileAnim();

  return (
    <RadioGroup.Item
      value={option.type}
      onPress={triggerTileTap}
      accessibilityLabel={option.label}
      style={[TILE_BOX_STYLE, isSelected ? TILE_SELECTED_COLORS : TILE_UNSELECTED_COLORS]}
    >
      {({ isSelected }) => (
        <>
          {isSelected ? (
            <>
              <LinearGradient
                colors={HERO_GRADIENT_COLORS}
                start={HERO_GRADIENT_START}
                end={HERO_GRADIENT_END}
                style={StyleSheet.absoluteFill}
              />
              <HeroGlow size={GLOW_SIZE} offset={GLOW_OFFSET} />
            </>
          ) : null}
          <Animated.View
            style={[
              { flexDirection: 'column', alignItems: 'flex-start', gap: Spacing.xs },
              tileAnim,
            ]}
          >
            <View
              style={{
                width: Size.compactChipHeight,
                height: Size.compactChipHeight,
                borderRadius: Size.compactChipHeight / 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className={isSelected ? 'bg-accent/15' : 'bg-default'}
            >
              <MaterialCommunityIcons
                name={option.icon}
                size={Size.iconSm}
                color={isSelected ? Colors.dark.gold : CoreTokens.text2}
              />
            </View>
            {/* Full-strength both branches; selection shows in the gradient, not dimming. */}
            <Typography
              className={cn('text-foreground', isSelected ? 'font-inter-semibold' : 'font-inter')}
              style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
              numberOfLines={1}
            >
              {option.label}
            </Typography>
          </Animated.View>
        </>
      )}
    </RadioGroup.Item>
  );
}
