import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { RadioGroup, Typography, cn } from 'heroui-native';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  HERO_GRADIENT_COLORS,
  HERO_GRADIENT_END,
  HERO_GRADIENT_START,
  heroGlowStyle,
} from '@/components/ui/hero_gradient';
import { Colors, Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

import type { TypeOption } from '../account_type_pill';
import { useAccountTypeTileAnim } from './account_form.anim';
import { ACCOUNT_TYPE_TILE_HEIGHT } from './account_form.geometry';

export interface AccountTypeTileProps {
  option: TypeOption;
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

const GLOW_STYLE = heroGlowStyle({ size: ms(74), offset: ms(22) });

/** The gradient and glow must be direct siblings, not children of the scaling `Animated.View`. */
export function AccountTypeTile({ option }: AccountTypeTileProps) {
  const { tileAnim, triggerTileTap } = useAccountTypeTileAnim();

  return (
    <RadioGroup.Item
      value={option.type}
      onPress={triggerTileTap}
      accessibilityLabel={option.label}
      style={TILE_BOX_STYLE}
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
              <View pointerEvents="none" style={GLOW_STYLE} />
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
