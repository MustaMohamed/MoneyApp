import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors, Size } from '@/constants/theme';
import { AccentTokens, AcctTokens, GoldTokens } from '@/constants/theme_tokens';

import { resolveLogoMarkA11y } from './logo_mark.a11y';

export interface LogoMarkProps {
  /** Edge length in dp. Default Size.logoMark (30) — the mockup's header size. */
  size?: number;
  /**
   * Screen-reader name. **Omit it** wherever a `MoneyApp` wordmark sits beside
   * the mark — that is the N1 header, and naming both announces the app twice.
   */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The Cross Fan mark at compact size — mockup `assets/mockup.html:879-885`,
 * symbol `#mark`, transcribed 1:1 including its 40x40 viewBox.
 *
 * This is NOT a scale-down of the launcher tile. The tile's cards are three
 * differently sized landscape rects with a drop shadow; the approved compact
 * mark is three identical portrait cards in flat token colours. Card order,
 * angles (+8 / -8 / +1.5) and the folded symbol are preserved, which is what
 * locked-design-2026-07-23.md:126-129 requires of a derived compact variant.
 *
 * The accessibility props sit on a wrapper View rather than on the Svg, the same
 * shape display_headline.tsx:31-32 ships — an ordinary View's accessibility is
 * not in question, and this task has no emulator run to catch a surprise.
 */
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
        {/* The nudge, scope.md decision 3: the teal dot sits on the card corner,
            not over the stem. Dot-over-stem is the anatomy of a lowercase "i"
            and read as "Mi" at launcher size. Do not move it back. */}
        <Circle cx={30.2} cy={8.6} r={2.7} fill={AccentTokens.nile} />
      </Svg>
    </View>
  );
}
