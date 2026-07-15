import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import type { BudgetCategoriesSummaryVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';

interface SummaryCardProps {
  summary: BudgetCategoriesSummaryVM;
  onSetIncome: () => void;
}

interface SummaryMetricProps {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
  onPress?: () => void;
}

function SummaryMetric({ label, value, tone = 'default', onPress }: SummaryMetricProps) {
  const metricClassName = 'flex-1 items-center justify-center px-1';
  const children = (
    <>
      <Text className="font-inter text-content-secondary text-center text-[11.5px]">{label}</Text>
      <Text
        className={
          tone === 'warning'
            ? 'font-sora text-warning mt-px text-center text-[15px] font-semibold'
            : 'font-sora text-foreground mt-px text-center text-[15px] font-semibold'
        }
      >
        {value}
      </Text>
    </>
  );

  return onPress ? (
    <PressableFeedback
      accessibilityRole="button"
      accessibilityLabel={Strings.budgetCategoriesSetIncome}
      onPress={onPress}
      className={metricClassName}
    >
      {children}
    </PressableFeedback>
  ) : (
    <View className={metricClassName}>{children}</View>
  );
}

function SummaryMetrics({
  summary,
  onSetIncome,
}: {
  summary: BudgetCategoriesSummaryVM;
  onSetIncome: () => void;
}) {
  return (
    <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
      <SummaryMetric label={Strings.budgetCategoriesSummaryPlanned} value={summary.plannedLabel} />
      <View className="bg-border w-px" />
      <SummaryMetric
        label={Strings.budgetCategoriesSummaryUnassignedIncome}
        value={summary.unassignedIncomeLabel}
        onPress={onSetIncome}
      />
      <View className="bg-border w-px" />
      <SummaryMetric
        label={Strings.budgetCategoriesSummaryUnbudgetedSpend}
        value={summary.unbudgetedSpendLabel}
        tone={summary.unbudgetedSpend > 0 ? 'warning' : 'default'}
      />
    </View>
  );
}

function SummaryStatusItem({ item }: { item: BudgetCategoriesSummaryVM['statusItems'][number] }) {
  return (
    <View className="flex-1 flex-row items-center justify-center gap-0.5">
      <MaterialCommunityIcons
        accessible={false}
        name={item.icon}
        size={Size.iconXs}
        color={item.color}
      />
      <Text
        className="font-inter text-content-secondary shrink text-[13px] font-medium"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {item.label}
      </Text>
    </View>
  );
}

export function SummaryCard({ summary, onSetIncome }: SummaryCardProps) {
  return (
    <Card className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0 shadow-none">
      <Card.Body className="px-2 py-1.5">
        <Text className="font-inter text-content-secondary text-[13px] font-semibold tracking-[0.3px] uppercase">
          {summary.eyebrowLabel}
        </Text>

        <View className="mt-0.5 flex-row items-center justify-between gap-3">
          {summary.hasPlan ? (
            <Text
              style={{ color: summary.balanceColor }}
              className="font-sora shrink text-[31px] font-bold"
            >
              {summary.balanceAmountLabel}
              <Text className="font-inter text-content-secondary text-[13px] font-medium">
                {' '}
                {summary.balanceMetaLabel}
              </Text>
            </Text>
          ) : (
            <Text className="font-sora text-foreground shrink text-[18px] font-bold">
              {summary.emptyLabel}
            </Text>
          )}
          <Text className="font-inter text-content-secondary text-[13px] font-semibold">
            {summary.lifecycleLabel}
          </Text>
        </View>

        {summary.hasPlan ? (
          <>
            <View className="mt-0.5 flex-row items-center justify-between gap-3">
              <Text className="font-inter text-foreground shrink text-[15px] font-semibold">
                {summary.spentPlannedLabel}
              </Text>
              {summary.usedLabel ? (
                <Text className="font-sora text-content-secondary text-[15px]">
                  {summary.usedLabel}
                </Text>
              ) : null}
            </View>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={summary.usedLabel}
              accessibilityValue={{ text: summary.usedLabel }}
              className="mt-1"
            >
              <BudgetBar
                pct={summary.usedPct ?? 0}
                status="under"
                color={summary.barColor}
                height={Size.spendingPlanProgressTrack}
              />
            </View>
          </>
        ) : null}
        <SummaryMetrics summary={summary} onSetIncome={onSetIncome} />
        {summary.statusItems.length > 0 ? (
          <View className="mt-1.5 flex-row items-center">
            {summary.statusItems.map((item) => (
              <SummaryStatusItem key={item.key} item={item} />
            ))}
          </View>
        ) : null}
      </Card.Body>
    </Card>
  );
}
