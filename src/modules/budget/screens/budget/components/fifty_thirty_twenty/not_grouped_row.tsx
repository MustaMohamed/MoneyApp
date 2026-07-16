import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, Size, Type } from '@/constants/theme';
import type { BudgetRuleLensVM } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { formatAmount } from '@/utils/format_amount';

export function NotGroupedRow({ value }: { value: NonNullable<BudgetRuleLensVM['notGrouped']> }) {
  return (
    <View className="border-border bg-surface mx-4 mt-2 flex-row items-center gap-2 rounded-xl border px-3 py-2">
      <View className="bg-default h-8 w-8 items-center justify-center rounded-full">
        <MaterialCommunityIcons name="shape-outline" size={Size.iconXs} color={Colors.dark.text2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: Type.caption }}
          className="font-sora text-foreground font-semibold"
        >
          {Strings.budget5030NotGroupedTitle}
        </Text>
        <Text style={{ fontSize: Type.micro }} className="font-inter text-content-secondary">
          {Strings.budget5030NotGroupedBody}
        </Text>
      </View>
      <Text
        style={{ fontSize: Type.micro }}
        className="font-inter text-content-secondary max-w-[46%] text-right font-medium"
        numberOfLines={2}
      >
        {Strings.budget5030NotGroupedAmounts(
          formatAmount(value.planned),
          formatAmount(value.spent),
        )}
      </Text>
    </View>
  );
}
