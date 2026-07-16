import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion, Button, Chip } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { BudgetGroup } from '@/constants/enums';
import { Colors, Size, Type } from '@/constants/theme';
import type { RuleBucketVM } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import { RuleContributorRow } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty/rule_contributor_row';

interface RuleBucketRowProps {
  bucket: RuleBucketVM;
  isExpanded: boolean;
  onManage: (group: BudgetGroup) => void;
}

export function RuleBucketRow({ bucket, isExpanded, onManage }: RuleBucketRowProps) {
  const presentation = bucket.presentation;

  return (
    <Accordion.Item value={bucket.group}>
      <Accordion.Trigger
        accessibilityLabel={presentation.accessibilityLabel}
        accessibilityState={{ expanded: isExpanded }}
        className="gap-0 px-3 py-1.5"
        style={{ minHeight: Size.budgetRuleRowMinHeight }}
      >
        <View className="flex-row items-center gap-2" style={{ flex: 1 }}>
          <BudgetRing
            pct={bucket.progressRatio ?? 0}
            color={presentation.ringColor}
            size={Size.budgetCategoryRing}
          >
            <MaterialCommunityIcons
              name={presentation.icon}
              size={Size.iconXs}
              color={presentation.ringColor}
            />
          </BudgetRing>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View className="flex-row items-center gap-1.5">
              <Text
                style={{ fontSize: Type.body }}
                className="font-sora text-foreground shrink font-semibold"
                numberOfLines={1}
              >
                {presentation.groupLabel}
              </Text>
              <Text style={{ fontSize: Type.micro }} className="font-sora text-content-secondary">
                {presentation.ruleLabel}
              </Text>
              <Chip
                size="sm"
                variant="soft"
                color={presentation.statusChipColor}
                className="h-5 shrink-0 py-0"
              >
                <Chip.Label
                  style={{ fontSize: Type.chipMeta }}
                  className="font-inter font-bold uppercase"
                >
                  {presentation.statusLabel}
                </Chip.Label>
              </Chip>
            </View>
            <Text
              style={{ fontSize: Type.micro }}
              className="font-inter text-content-secondary mt-0.5"
              numberOfLines={1}
            >
              {presentation.detailsLabel}
            </Text>
          </View>
          <View style={{ width: Size.budgetRuleValueColumn }} className="items-end">
            <Text
              style={{ color: presentation.varianceColor, fontSize: Type.bodyStrong }}
              className="font-sora font-bold"
              numberOfLines={1}
            >
              {presentation.varianceLabel}
            </Text>
            <Text
              style={{ fontSize: Type.chip }}
              className="font-inter text-content-secondary text-right"
              numberOfLines={2}
            >
              {presentation.varianceMetaLabel}
            </Text>
          </View>
          <Accordion.Indicator
            isAnimatedStyleActive={false}
            style={{ width: Size.budgetRuleChevronColumn }}
            className="items-end"
          >
            <MaterialCommunityIcons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={Size.iconXs}
              color={Colors.dark.text2}
            />
          </Accordion.Indicator>
        </View>
      </Accordion.Trigger>
      <Accordion.Content className="bg-background/30 px-0 pb-0" style={{ padding: 0 }}>
        <View className="border-separator flex-row border-y px-2 py-1.5">
          {presentation.metrics.map((metric) => (
            <View key={metric.key} className="flex-1 items-center px-1">
              <Text style={{ fontSize: Type.chip }} className="font-inter text-content-secondary">
                {metric.label}
              </Text>
              <Text
                style={{ fontSize: Type.caption }}
                className="font-sora text-foreground mt-px text-center font-semibold"
              >
                {metric.value}
              </Text>
            </View>
          ))}
        </View>
        <View className="bg-default mx-3 my-2 flex-row items-center gap-2 rounded-lg px-2 py-1.5">
          <MaterialCommunityIcons
            name={presentation.insightIcon}
            size={Size.iconXs}
            color={presentation.ringColor}
          />
          <Text
            style={{ fontSize: Type.micro }}
            className="font-inter text-content-secondary flex-1"
          >
            {presentation.insightLabel}
          </Text>
        </View>
        {bucket.contributors.map((contributor) => (
          <RuleContributorRow key={contributor.categoryId} contributor={contributor} />
        ))}
        <Button
          variant="ghost"
          size="sm"
          onPress={() => onManage(bucket.group)}
          className="min-h-10 justify-between rounded-none px-3"
        >
          <Button.Label className="font-inter text-foreground font-semibold">
            {presentation.manageLabel}
          </Button.Label>
          <MaterialCommunityIcons name="arrow-right" size={Size.iconXs} color={Colors.dark.text2} />
        </Button>
      </Accordion.Content>
    </Accordion.Item>
  );
}
