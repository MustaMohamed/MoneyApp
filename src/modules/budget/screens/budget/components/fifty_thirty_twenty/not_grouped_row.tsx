import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Colors, Size, Type, lineHeightFor } from '@/constants/theme';
import type { BudgetRuleLensVM } from '@/modules/budget/screens/budget/budget_buckets.helpers';

export function NotGroupedRow({ value }: { value: NonNullable<BudgetRuleLensVM['notGrouped']> }) {
  const { presentation } = value;
  const { fontScale } = useWindowDimensions();
  // Above font scale 1 the amounts wrap between words with no cap, so neither ends in `…` after a group.
  const amountLines = fontScale > 1 ? undefined : 2;

  return (
    <View className="border-border bg-surface mx-4 mt-2 flex-row items-center gap-2 rounded-xl border px-3 py-2">
      <View className="bg-default h-8 w-8 items-center justify-center rounded-full">
        <MaterialCommunityIcons name="shape-outline" size={Size.iconXs} color={Colors.dark.text2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
          className="font-sora-semibold text-foreground"
        >
          {presentation.titleLabel}
        </Text>
        <Text
          style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
          className="font-inter text-content-secondary"
        >
          {presentation.bodyLabel}
        </Text>
      </View>
      <Text
        allowFontScaling={false}
        style={scaledTextStyle(Type.micro, fontScale)}
        className="font-inter-medium text-content-secondary max-w-[46%] text-right"
        numberOfLines={amountLines}
      >
        {presentation.amountsLabel}
      </Text>
    </View>
  );
}
