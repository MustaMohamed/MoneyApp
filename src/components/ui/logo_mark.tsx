import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors, Size } from '@/constants/theme';
import { AccentTokens, AcctTokens, GoldTokens } from '@/constants/theme_tokens';

import { resolveLogoMarkA11y } from './logo_mark.a11y';

export interface LogoMarkProps {
  /** Edge length in dp. Default `Size.logoMark` (30), the mockup's header size. */
  size?: number;
  /** Omit wherever a `MoneyApp` wordmark sits beside the mark, or it announces the app twice. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Transcribed 1:1 from `assets/mockup.html:879-885` symbol `#mark`, 40x40 viewBox included. */
export function LogoMark({ size = Size.logoMark, accessibilityLabel, style }: LogoMarkProps) {
  const a11y = resolveLogoMarkA11y(accessibilityLabel);

  return (
    <View style={style} {...a11y.container}>
      <Svg width={size} height={size} viewBox="0 0 40 40" {...a11y.graphic}>
        <Rect
          x={8}
          y={7}
          width={24}
          height={28}
          rx={5}
          fill={AcctTokens.midnight.soft}
          transform="rotate(8 20 21)"
        />
        <Rect
          x={8}
          y={7}
          width={24}
          height={28}
          rx={5}
          fill={AcctTokens.lapis.soft}
          transform="rotate(-8 20 21)"
        />
        <Rect
          x={8}
          y={7}
          width={24}
          height={28}
          rx={5}
          fill={GoldTokens[600]}
          transform="rotate(1.5 20 21)"
        />
        <Path
          d="M14 28 L14 15 L20 21.5 L26 15 L26 28"
          fill="none"
          stroke={Colors.dark.bg}
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="rotate(1.5 20 21)"
        />
        {/* The teal dot sits on the card corner: over the stem it reads as "Mi". */}
        <Circle cx={30.2} cy={8.6} r={2.7} fill={AccentTokens.nile} />
      </Svg>
    </View>
  );
}
