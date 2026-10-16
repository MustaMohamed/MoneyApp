import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';
import { tv } from 'tailwind-variants';

import { Text } from '@/components/ui/text';
import { scaledFontSize, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';
import { GoldTokens, SemanticTokens } from '@/constants/theme_tokens';

export type TypeBadgeKind = 'commitment' | 'goal' | 'bill';

interface Props {
  type: TypeBadgeKind;
  /** Given, the label draws at this scale (ADR 2026-09-27 §7), and the badge may shrink. */
  fontScale?: number;
}

const wrap = tv({
  base: 'flex-row items-center rounded-full border px-2 py-[2px] gap-1',
  variants: {
    type: {
      commitment: 'bg-accent/15 border-accent/30',
      goal: 'bg-success/15 border-success/30',
      bill: 'bg-warning/15 border-warning/30',
    },
  },
});

const labelVariants = tv({
  base: 'font-inter-semibold',
  variants: {
    type: {
      commitment: 'text-accent',
      goal: 'text-success',
      bill: 'text-warning',
    },
  },
});

const LABEL_STYLE = { fontSize: Type.compactBadge, lineHeight: lineHeightFor(Type.compactBadge) };

const ICON_SIZE = 10;

// The `wrap` chrome beside the icon: the 1 dp border and the `px-2` on each side, and the `gap-1`.
const CHROME_WIDTH = 2 * (1 + 8) + 4;

// A `…` in ems of the label's size, so the narrowest badge still draws one.
const ELLIPSIS_EM = 1;

const ICON: Record<TypeBadgeKind, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  commitment: 'clock-outline',
  goal: 'target',
  bill: 'file-document-outline',
};

const ICON_COLOR: Record<TypeBadgeKind, string> = {
  commitment: GoldTokens[500],
  goal: SemanticTokens.positive,
  bill: SemanticTokens.warning,
};

const LABEL: Record<TypeBadgeKind, string> = {
  commitment: Strings.typeBadgeCommitment,
  goal: Strings.typeBadgeGoal,
  bill: Strings.typeBadgeBill,
};

/** The narrowest a scaled badge gets: its icon and a `…`. */
export function resolveTypeBadgeMinWidth(fontScale: number): number {
  return CHROME_WIDTH + ICON_SIZE + scaledFontSize(LABEL_STYLE.fontSize, fontScale) * ELLIPSIS_EM;
}

export function TypeBadge({ type, fontScale }: Props): React.ReactElement {
  const shrinks = fontScale !== undefined;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={LABEL[type]}
      className={wrap({ type })}
      style={shrinks ? { flexShrink: 1 } : undefined}
    >
      <MaterialCommunityIcons name={ICON[type]} size={ICON_SIZE} color={ICON_COLOR[type]} />
      <Text
        allowFontScaling={!shrinks}
        className={labelVariants({ type })}
        style={
          shrinks
            ? { ...scaledTextStyle(LABEL_STYLE.fontSize, fontScale), flexShrink: 1 }
            : LABEL_STYLE
        }
        numberOfLines={shrinks ? 1 : undefined}
      >
        {LABEL[type]}
      </Text>
    </View>
  );
}
