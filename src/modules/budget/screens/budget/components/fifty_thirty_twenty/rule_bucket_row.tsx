import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion, Button, Chip } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size, Type } from '@/constants/theme';
import type {
  RuleBucketStatus,
  RuleBucketVM,
} from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import { RuleContributorRow } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty/rule_contributor_row';
import { formatAmount } from '@/utils/format_amount';

interface RuleBucketRowProps {
  bucket: RuleBucketVM;
  isExpanded: boolean;
  onManage: (group: BudgetGroup) => void;
}

const GROUP_PRESENTATION = {
  [BudgetGroup.Need]: {
    label: Strings.budget5030NeedLabel,
    ratio: Strings.budget5030NeedPct,
    icon: 'home-heart' as const,
  },
  [BudgetGroup.Want]: {
    label: Strings.budget5030WantLabel,
    ratio: Strings.budget5030WantPct,
    icon: 'gamepad-variant-outline' as const,
  },
  [BudgetGroup.Savings]: {
    label: Strings.budget5030SavingsLabel,
    ratio: Strings.budget5030SavingsPct,
    icon: 'piggy-bank-outline' as const,
  },
};

const STATUS_PRESENTATION: Record<
  RuleBucketStatus,
  { label: string; color: 'default' | 'success' | 'danger' | 'warning'; ringColor: string }
> = {
  'income-needed': {
    label: Strings.budget5030StatusIncomeNeeded,
    color: 'default',
    ringColor: Colors.dark.budgetUnder,
  },
  'no-plan': {
    label: Strings.budget5030StatusNoPlan,
    color: 'default',
    ringColor: Colors.dark.budgetUnder,
  },
  'within-cap': {
    label: Strings.budget5030StatusWithinCap,
    color: 'success',
    ringColor: Colors.dark.positive,
  },
  'over-cap': {
    label: Strings.budget5030StatusOverCap,
    color: 'danger',
    ringColor: Colors.dark.negative,
  },
  'target-met': {
    label: Strings.budget5030StatusTargetMet,
    color: 'success',
    ringColor: Colors.dark.positive,
  },
  'below-target': {
    label: Strings.budget5030StatusBelowTarget,
    color: 'warning',
    ringColor: Colors.dark.budgetWatch,
  },
};

function insight(bucket: RuleBucketVM, groupLabel: string): string {
  const variance = formatAmount(Math.abs(bucket.variance ?? 0));
  switch (bucket.status) {
    case 'income-needed':
      return Strings.budget5030InsightIncomeNeeded;
    case 'no-plan':
      return Strings.budget5030InsightNoPlan(groupLabel);
    case 'within-cap':
      return Strings.budget5030InsightWithinCap(groupLabel, variance);
    case 'over-cap':
      return Strings.budget5030InsightOverCap(groupLabel, variance);
    case 'target-met':
      return bucket.variance === 0
        ? Strings.budget5030InsightTargetMatched
        : Strings.budget5030InsightTargetMet(variance);
    case 'below-target':
      return Strings.budget5030InsightBelowTarget(variance);
  }
}

export function RuleBucketRow({ bucket, isExpanded, onManage }: RuleBucketRowProps) {
  const group = GROUP_PRESENTATION[bucket.group];
  const status = STATUS_PRESENTATION[bucket.status];
  const isSavings = bucket.group === BudgetGroup.Savings;
  const actualLabel = isSavings
    ? Strings.budget5030ActualNotTracked
    : Strings.budget5030Spent(formatAmount(bucket.actual ?? 0));
  const targetLabel =
    bucket.target === undefined ? Strings.budget5030Unavailable : formatAmount(bucket.target);
  const variance = bucket.variance;
  const varianceLabel =
    variance === undefined ? Strings.budget5030Unavailable : formatAmount(Math.abs(variance));
  const varianceMeta =
    variance === undefined
      ? Strings.budget5030NotReady
      : variance < 0
        ? isSavings
          ? Strings.budget5030VarianceAbove
          : Strings.budget5030VarianceOver
        : isSavings
          ? Strings.budget5030VarianceShort
          : Strings.budget5030VarianceLeft;
  const bucketDetails = Strings.budget5030BucketSummary(
    formatAmount(bucket.planned),
    targetLabel,
    actualLabel,
  );

  return (
    <Accordion.Item value={bucket.group}>
      <Accordion.Trigger
        accessibilityLabel={Strings.budget5030BucketA11y(
          group.label,
          status.label,
          bucketDetails,
          `${varianceLabel} ${varianceMeta}`,
        )}
        accessibilityState={{ expanded: isExpanded }}
        className="gap-0 px-3 py-2"
      >
        <View className="flex-row items-center gap-2.5" style={{ flex: 1 }}>
          <BudgetRing
            pct={bucket.progressRatio ?? 0}
            color={status.ringColor}
            size={Size.budgetCategoryRing}
          >
            <MaterialCommunityIcons name={group.icon} size={Size.iconXs} color={status.ringColor} />
          </BudgetRing>
          <View style={{ flex: 1 }}>
            <View className="flex-row items-center gap-1.5">
              <Text
                style={{ fontSize: Type.body }}
                className="font-sora text-foreground font-semibold"
              >
                {group.label}
              </Text>
              <Text style={{ fontSize: Type.micro }} className="font-sora text-content-secondary">
                {group.ratio}
              </Text>
              <Chip size="sm" variant="soft" color={status.color} className="h-5 py-0">
                <Chip.Label
                  style={{ fontSize: Type.chipMeta }}
                  className="font-inter font-bold uppercase"
                >
                  {status.label}
                </Chip.Label>
              </Chip>
            </View>
            <Text
              style={{ fontSize: Type.micro }}
              className="font-inter text-content-secondary mt-0.5"
              numberOfLines={1}
            >
              {bucketDetails}
            </Text>
          </View>
          <View className="max-w-[28%] items-end">
            <Text
              style={{
                color:
                  variance !== undefined && variance < 0 ? Colors.dark.negative : status.ringColor,
                fontSize: Type.bodyStrong,
              }}
              className="font-sora font-bold"
              numberOfLines={1}
            >
              {varianceLabel}
            </Text>
            <Text
              style={{ fontSize: Type.chip }}
              className="font-inter text-content-secondary text-right"
              numberOfLines={2}
            >
              {varianceMeta}
            </Text>
          </View>
          <Accordion.Indicator isAnimatedStyleActive={false}>
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
          {[
            [Strings.budget5030TargetMetric, targetLabel],
            [Strings.budget5030PlannedMetric, formatAmount(bucket.planned)],
            [
              isSavings ? Strings.budget5030ActualMetric : Strings.budget5030SpentMetric,
              isSavings ? Strings.budget5030ActualNotTracked : formatAmount(bucket.actual ?? 0),
            ],
          ].map(([label, value]) => (
            <View key={label} className="flex-1 items-center px-1">
              <Text style={{ fontSize: Type.chip }} className="font-inter text-content-secondary">
                {label}
              </Text>
              <Text
                style={{ fontSize: Type.caption }}
                className="font-sora text-foreground mt-px text-center font-semibold"
              >
                {value}
              </Text>
            </View>
          ))}
        </View>
        <View className="bg-default mx-3 my-2 flex-row items-center gap-2 rounded-lg px-2 py-1.5">
          <MaterialCommunityIcons
            name={bucket.status === 'over-cap' ? 'alert-circle-outline' : 'lightbulb-outline'}
            size={Size.iconXs}
            color={status.ringColor}
          />
          <Text
            style={{ fontSize: Type.micro }}
            className="font-inter text-content-secondary flex-1"
          >
            {insight(bucket, group.label)}
          </Text>
        </View>
        {bucket.contributors.map((contributor) => (
          <RuleContributorRow
            key={contributor.categoryId}
            contributor={contributor}
            group={bucket.group}
          />
        ))}
        <Button
          variant="ghost"
          size="sm"
          onPress={() => onManage(bucket.group)}
          className="min-h-10 justify-between rounded-none px-3"
        >
          <Button.Label className="font-inter text-accent font-semibold">
            {Strings.budget5030ManageGroup(group.label)}
          </Button.Label>
          <MaterialCommunityIcons name="arrow-right" size={Size.iconXs} color={Colors.dark.gold} />
        </Button>
      </Accordion.Content>
    </Accordion.Item>
  );
}
