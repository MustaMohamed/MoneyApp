import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback, Text as HeroText } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import type { BudgetCategoriesSummaryVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import { ms } from '@/utils/responsive';

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
  const content = (
    <View className="items-center px-1 py-1.5">
      <HeroText className="font-inter text-muted text-center text-[9px] font-medium uppercase">
        {label}
      </HeroText>
      <HeroText
        className={
          tone === 'warning'
            ? 'font-sora text-warning mt-0.5 text-[12px] font-semibold'
            : 'font-sora text-foreground mt-0.5 text-[12px] font-semibold'
        }
      >
        {value}
      </HeroText>
    </View>
  );

  return onPress ? (
    <PressableFeedback
      accessibilityRole="button"
      accessibilityLabel={Strings.budgetCategoriesSetIncome}
      onPress={onPress}
      className="flex-1"
    >
      {content}
    </PressableFeedback>
  ) : (
    <View className="flex-1">{content}</View>
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
    <View className="border-separator mt-1.5 flex-row border-t">
      <SummaryMetric label={Strings.budgetCategoriesSummaryPlanned} value={summary.plannedLabel} />
      <View className="bg-separator w-px" />
      <SummaryMetric
        label={Strings.budgetCategoriesSummaryUnassignedIncome}
        value={summary.unassignedIncomeLabel}
        onPress={onSetIncome}
      />
      <View className="bg-separator w-px" />
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
    <View className="flex-1 items-center gap-0.5 py-1.5">
      <MaterialCommunityIcons name={item.icon} size={ms(16)} color={item.color} />
      <HeroText className="font-inter text-muted text-[9px] font-medium">{item.label}</HeroText>
    </View>
  );
}

export function SummaryCard({ summary, onSetIncome }: SummaryCardProps) {
  return (
    <Card className="bg-surface border-border mx-4 mt-3 rounded-xl border p-0 shadow-none">
      <Card.Body className="px-3 py-2">
        <View className="flex-row items-start justify-between gap-3">
          <View style={{ flex: 1 }}>
            <HeroText className="font-inter text-muted text-[10px] font-semibold uppercase">
              {summary.eyebrowLabel}
            </HeroText>
            <HeroText
              style={{ color: summary.balanceColor }}
              className="font-sora mt-0.5 text-[25px] font-bold"
            >
              {`${summary.balanceAmountLabel} `}
              <HeroText className="font-inter text-muted text-[11px] font-semibold">
                {summary.balanceMetaLabel}
              </HeroText>
            </HeroText>
          </View>
          <HeroText className="font-inter text-muted mt-0.5 text-[10px] font-semibold">
            {summary.lifecycleLabel}
          </HeroText>
        </View>

        <View className="mt-1 flex-row items-center justify-between gap-3">
          <HeroText className="font-inter text-foreground text-[12px] font-medium">
            {summary.spentPlannedLabel}
          </HeroText>
          {summary.usedLabel ? (
            <HeroText className="font-inter text-muted text-[11px] font-semibold">
              {summary.usedLabel}
            </HeroText>
          ) : null}
        </View>
        <BudgetBar
          pct={summary.usedPct ?? 0}
          status="under"
          color={summary.barColor}
          height={ms(5)}
        />
        <SummaryMetrics summary={summary} onSetIncome={onSetIncome} />
        <View className="border-separator flex-row items-center border-t">
          {summary.statusItems.map((item) => (
            <SummaryStatusItem key={item.key} item={item} />
          ))}
        </View>
      </Card.Body>
    </Card>
  );
}
