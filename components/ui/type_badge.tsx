import React from 'react';
import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { tv } from 'tailwind-variants';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

export type TypeBadgeKind = 'commitment' | 'goal' | 'bill';
export type TypeBadgeSize = 'sm' | 'md';

interface Props {
  type: TypeBadgeKind;
  size?: TypeBadgeSize;
}

const wrap = tv({
  base: 'flex-row items-center rounded-full border',
  variants: {
    type: {
      commitment: 'bg-cairoGold/15 border-cairoGold/30',
      goal: 'bg-positive/15 border-positive/30',
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
  base: 'font-inter font-semibold',
  variants: {
    type: {
      commitment: 'text-cairoGold',
      goal: 'text-positive',
      bill: 'text-warning',
    },
    size: {
      sm: 'text-[9.5px]',
      md: 'text-[11px]',
    },
  },
  defaultVariants: { size: 'sm' },
});

const ICON: Record<TypeBadgeKind, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  commitment: 'clock-outline',
  goal: 'target',
  bill: 'file-document-outline',
};

const ICON_COLOR: Record<TypeBadgeKind, string> = {
  commitment: '#D4AF37',
  goal: '#6EE7B7',
  bill: '#FFAE5C',
};

const LABEL: Record<TypeBadgeKind, string> = {
  commitment: Strings.typeBadgeCommitment,
  goal: Strings.typeBadgeGoal,
  bill: Strings.typeBadgeBill,
};

export function TypeBadge({ type, size = 'sm' }: Props): React.ReactElement {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={LABEL[type]}
      className={wrap({ type, size })}
    >
      <MaterialCommunityIcons
        name={ICON[type]}
        size={size === 'sm' ? 10 : 12}
        color={ICON_COLOR[type]}
      />
      <Text className={labelVariants({ type, size })}>{LABEL[type]}</Text>
    </View>
  );
}
