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
export type TypeBadgeSize = 'sm' | 'md';

interface Props {
  type: TypeBadgeKind;
  size?: TypeBadgeSize;
  /** Given, the label draws at this scale (ADR 2026-09-27 §7), and the badge may shrink. */
  fontScale?: number;
}

const wrap = tv({
  base: 'flex-row items-center rounded-full border',
  variants: {
    type: {
      commitment: 'bg-accent/15 border-accent/30',
      goal: 'bg-success/15 border-success/30',
      bill: 'bg-warning/15 border-warning/30',
    },
    size: {
      sm: 'px-2 py-[2px] gap-1',
      md: 'px-2.5 py-1 gap-1.5',
    },
  },
  defaultVariants: { size: 'sm' },
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

const LABEL_STYLE = {
  sm: { fontSize: Type.compactBadge, lineHeight: lineHeightFor(Type.compactBadge) },
  md: { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) },
} as const;

const ICON_SIZE: Record<TypeBadgeSize, number> = { sm: 10, md: 12 };

// The `wrap` chrome beside the icon: the 1 dp border and the `px-*` on each side, and the `gap-*`.
const CHROME_WIDTH: Record<TypeBadgeSize, number> = { sm: 2 * (1 + 8) + 4, md: 2 * (1 + 10) + 6 };

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
export function resolveTypeBadgeMinWidth(fontScale: number, size: TypeBadgeSize = 'sm'): number {
  return (
    CHROME_WIDTH[size] +
    ICON_SIZE[size] +
    scaledFontSize(LABEL_STYLE[size].fontSize, fontScale) * ELLIPSIS_EM
  );
}

export function TypeBadge({ type, size = 'sm', fontScale }: Props): React.ReactElement {
  const shrinks = fontScale !== undefined;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={LABEL[type]}
      className={wrap({ type, size })}
      style={shrinks ? { flexShrink: 1 } : undefined}
    >
      <MaterialCommunityIcons name={ICON[type]} size={ICON_SIZE[size]} color={ICON_COLOR[type]} />
      <Text
        allowFontScaling={!shrinks}
        className={labelVariants({ type })}
        style={
          shrinks
            ? { ...scaledTextStyle(LABEL_STYLE[size].fontSize, fontScale), flexShrink: 1 }
            : LABEL_STYLE[size]
        }
        numberOfLines={shrinks ? 1 : undefined}
      >
        {LABEL[type]}
      </Text>
    </View>
  );
}
