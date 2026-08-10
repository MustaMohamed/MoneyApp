import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { RadioGroup, Typography, cn } from 'heroui-native';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Colors, Radius, Size, Spacing, Type } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

import type { TypeOption } from '../account_type_pill';
import { useAccountTypeTileAnim } from './account_form.anim';
import { ACCOUNT_TYPE_TILE_HEIGHT } from './account_form.geometry';

export interface AccountTypeTileProps {
  option: TypeOption;
}

/**
 * Invariant on every tile in every state (MA-009 plan decision 3 / step 7).
 * All four layout properties below are load-bearing, not redundant: the
 * wrapper's own `.radio-group__item` class is
 * `flex-direction: row; justify-content: space-between` — the exact
 * opposite of a tile — and `style` beats `className` in RN, so each has to
 * be stated explicitly to win (radio-group.css:5-10).
 */
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

/** Corner glow — HeroShell's own formula (decision 7), composed locally. */
const GLOW_STYLE: ViewStyle = {
  position: 'absolute',
  top: -ms(22),
  right: -ms(22),
  width: ms(74),
  height: ms(74),
  borderRadius: ms(37),
  backgroundColor: Colors.dark.gold,
  opacity: 0.18,
};

/**
 * One tile in the 3-column, 5-tile account-type grid (mockup C1, 114x76).
 * Selection changes `borderColor`, the gradient + glow, the icon-chip fill
 * and the label colour — nothing in `TILE_BOX_STYLE`, which is why grid
 * position and tile size cannot move when the user picks a different type.
 *
 * The gradient and glow are direct (non-animated) siblings of the content,
 * not children of the scaling `Animated.View` below — RN positions an
 * absolutely-positioned child against its direct parent's padding box, so
 * placing them here lets the fill bleed to the tile's own edges exactly as
 * `.tile.on`'s CSS `background` does in the mockup. The spring pop only
 * scales the foreground content (icon chip + label); the outer Pressable
 * that carries `TILE_BOX_STYLE` is never touched by the animated style, so
 * the tile's own layout contribution is untouched by the animation too.
 */
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
                colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
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
            <Typography
              className={cn(
                isSelected
                  ? 'font-inter-semibold text-foreground'
                  : 'font-inter text-content-secondary',
              )}
              style={{ fontSize: Type.caption }}
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
