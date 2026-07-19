import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Size, Type } from '@/constants/theme';
import type { BudgetRuleContributorVM } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import { toIconName } from '@/utils/icon_name_guard';

interface RuleContributorRowProps {
  contributor: BudgetRuleContributorVM;
}

export function RuleContributorRow({ contributor }: RuleContributorRowProps) {
  const presentation = contributor.presentation;
  return (
    <View className="border-separator min-h-12 flex-row items-center gap-2 border-b px-3 py-1.5">
      <View className="items-center" style={{ width: Size.budgetCategoryColumn }}>
        <BudgetRing
          pct={presentation.progressRatio}
          color={presentation.ringColor}
          size={Size.budgetNamedRing}
        >
          <MaterialCommunityIcons
            name={toIconName(contributor.icon, 'tag-outline')}
            size={Size.iconXs}
            color={contributor.color}
          />
        </BudgetRing>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: Type.caption }}
          className="font-sora text-foreground font-semibold"
          numberOfLines={1}
        >
          {contributor.name}
        </Text>
        {presentation.planShareLabel ? (
          <Text style={{ fontSize: Type.micro }} className="font-inter text-content-secondary">
            {presentation.planShareLabel}
          </Text>
        ) : null}
      </View>
      <View className="max-w-[46%] items-end">
        <Text
          style={{ fontSize: Type.caption }}
          className="font-sora text-foreground text-right font-semibold"
          numberOfLines={2}
        >
          {presentation.resultLabel}
        </Text>
        {presentation.resultMetaLabel ? (
          <Text
            style={{ fontSize: Type.chip }}
            className="font-inter text-content-secondary text-right"
            numberOfLines={1}
          >
            {presentation.resultMetaLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
