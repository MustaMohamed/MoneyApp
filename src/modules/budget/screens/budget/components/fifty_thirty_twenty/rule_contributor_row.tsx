import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import type { BudgetRuleContributorVM } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { formatAmount } from '@/utils/format_amount';
import { toIconName } from '@/utils/icon_name_guard';

interface RuleContributorRowProps {
  contributor: BudgetRuleContributorVM;
  group: BudgetGroup;
}

export function RuleContributorRow({ contributor, group }: RuleContributorRowProps) {
  const groupLabel =
    group === BudgetGroup.Need
      ? Strings.budget5030NeedLabel
      : group === BudgetGroup.Want
        ? Strings.budget5030WantLabel
        : Strings.budget5030SavingsLabel;
  const planShare = Math.round((contributor.planShareRatio ?? 0) * 100);
  const isSavings = group === BudgetGroup.Savings;

  return (
    <View className="border-separator min-h-12 flex-row items-center gap-2 border-b px-3 py-1.5">
      <View className="bg-default h-8 w-8 items-center justify-center rounded-full">
        <MaterialCommunityIcons
          name={toIconName(contributor.icon, 'tag-outline')}
          size={Size.iconXs}
          color={contributor.color}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: Type.caption }}
          className="font-sora text-foreground font-semibold"
          numberOfLines={1}
        >
          {contributor.name}
        </Text>
        {contributor.planShareRatio !== undefined ? (
          <Text style={{ fontSize: Type.micro }} className="font-inter text-content-secondary">
            {Strings.budget5030PlanShare(planShare, groupLabel)}
          </Text>
        ) : null}
      </View>
      <View className="max-w-[46%] items-end">
        <Text
          style={{ fontSize: Type.caption }}
          className="font-sora text-foreground text-right font-semibold"
          numberOfLines={2}
        >
          {isSavings
            ? Strings.budget5030PlannedOnly(formatAmount(contributor.planned))
            : contributor.isUnbudgeted
              ? Strings.budget5030Unbudgeted(formatAmount(contributor.spent ?? 0))
              : Strings.budget5030SpentOfPlanned(
                  formatAmount(contributor.spent ?? 0),
                  formatAmount(contributor.planned),
                )}
        </Text>
        <Text
          style={{ fontSize: Type.chip }}
          className="font-inter text-content-secondary text-right"
          numberOfLines={1}
        >
          {isSavings
            ? Strings.budget5030ActualNotTracked
            : contributor.isUnbudgeted
              ? Strings.budget5030StatusNoPlan
              : Strings.budget5030SpentPlannedMeta}
        </Text>
      </View>
    </View>
  );
}
