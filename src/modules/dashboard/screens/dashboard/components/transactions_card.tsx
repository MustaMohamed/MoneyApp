import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback, Skeleton } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { SemanticTokens } from '@/constants/theme_tokens';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import {
  computeDeltaPct,
  deltaDisplay,
  expenseSharePct,
  formatSignedAmount,
  type DeltaDirection,
  type PolaritySignal,
  type TotalsMetric,
} from '@/modules/transactions/screens/transactions/transactions.helpers';
import { formatMonthYear } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

import { DASHBOARD_SKELETON_ANIMATION } from './skeleton_animation';

interface Props {
  current: PeriodTotals;
  previous: PeriodTotals | null;
  previousLabel: string | null;
  yearMonth: string;
  isLoading: boolean;
  onPress: () => void;
}

type Align = 'left' | 'center' | 'right';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const DASHBOARD_TRANSACTIONS_VALUE_ROW_HEIGHT = ms(14);
const DASHBOARD_TRANSACTIONS_PROGRESS_HEIGHT = ms(3);
const DASHBOARD_TRANSACTIONS_DELTA_ROW_HEIGHT = ms(13);
const DASHBOARD_TRANSACTIONS_PREVIOUS_LABEL_HEIGHT = ms(10);

const METRICS: Array<{
  key: TotalsMetric;
  label: string;
  align: Align;
  valueClass: string;
}> = [
  { key: 'income', label: Strings.totalsIncome, align: 'left', valueClass: 'text-success' },
  { key: 'expense', label: Strings.totalsExpense, align: 'center', valueClass: 'text-danger' },
  { key: 'net', label: Strings.totalsNet, align: 'right', valueClass: 'text-info' },
];

function currentValue(current: PeriodTotals, metric: TotalsMetric): number {
  if (metric === 'income') return current.incomeEgp;
  if (metric === 'expense') return current.expenseEgp;
  return current.netEgp;
}

function polarityClass(polarity: PolaritySignal): string {
  if (polarity === 'good') return 'text-success';
  if (polarity === 'bad') return 'text-danger';
  return 'text-foreground/50';
}

function polarityColor(polarity: PolaritySignal): string {
  if (polarity === 'good') return Colors.dark.positive;
  if (polarity === 'bad') return Colors.dark.negative;
  return Colors.dark.text2;
}

function directionIcon(direction: DeltaDirection): IconName {
  if (direction === 'up') return 'arrow-up';
  if (direction === 'down') return 'arrow-down';
  return 'minus';
}

function MetricValue({
  value,
  label,
  align,
  className,
}: {
  value: string;
  label: string;
  align: Align;
  className: string;
}): React.ReactElement {
  return (
    <Text
      className={`font-sora-bold text-[14px] ${className}`}
      style={{ flex: 1, textAlign: align }}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      accessibilityLabel={`${label} ${value}`}
    >
      {value}
    </Text>
  );
}

function DeltaValue({
  metric,
  deltaPct,
  align,
}: {
  metric: TotalsMetric;
  deltaPct: number | null;
  align: Align;
}): React.ReactElement {
  const delta = deltaDisplay(metric, deltaPct);
  const justifyContent =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  if (!delta) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        }}
      >
        <Text className="font-sora-bold text-foreground/40 text-[11px]">—</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', justifyContent, alignItems: 'center' }}>
      <MaterialCommunityIcons
        name={directionIcon(delta.direction)}
        size={ms(12)}
        color={polarityColor(delta.polarity)}
      />
      <Text className={`font-sora-bold ml-0.5 text-[11px] ${polarityClass(delta.polarity)}`}>
        {delta.label}
      </Text>
    </View>
  );
}

function TransactionsCardSkeleton(): React.ReactElement {
  return (
    <>
      <View
        testID="dashboard-transactions-skeleton-values-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: ms(32),
          minHeight: DASHBOARD_TRANSACTIONS_VALUE_ROW_HEIGHT,
        }}
      >
        {METRICS.map((metric) => (
          <Skeleton
            key={metric.key}
            animation={DASHBOARD_SKELETON_ANIMATION}
            className="rounded-md"
            style={{ flex: 1, height: DASHBOARD_TRANSACTIONS_VALUE_ROW_HEIGHT }}
          />
        ))}
      </View>
      <Skeleton
        testID="dashboard-transactions-skeleton-progress"
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="w-full rounded-[2px]"
        style={{ height: DASHBOARD_TRANSACTIONS_PROGRESS_HEIGHT }}
      />
      <View
        testID="dashboard-transactions-skeleton-deltas-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: ms(8),
          minHeight: DASHBOARD_TRANSACTIONS_DELTA_ROW_HEIGHT,
        }}
      >
        {METRICS.map((metric) => (
          <View
            key={metric.key}
            testID="dashboard-transactions-skeleton-delta-pill"
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent:
                metric.align === 'left'
                  ? 'flex-start'
                  : metric.align === 'right'
                    ? 'flex-end'
                    : 'center',
              alignItems: 'center',
              gap: ms(4),
            }}
          >
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="rounded-full"
              style={{ width: ms(14), height: ms(10) }}
            />
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="rounded-md"
              style={{ width: ms(32), height: ms(10) }}
            />
          </View>
        ))}
      </View>
      <Skeleton
        testID="dashboard-transactions-skeleton-previous-label"
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="mx-auto w-18 rounded-md"
        style={{ height: DASHBOARD_TRANSACTIONS_PREVIOUS_LABEL_HEIGHT }}
      />
    </>
  );
}

export function TransactionsCard({
  current,
  previous,
  previousLabel,
  yearMonth,
  isLoading,
  onPress,
}: Props): React.ReactElement {
  const monthLabel = formatMonthYear(yearMonth);
  const expensePct = expenseSharePct(current);
  const deltas = previous
    ? {
        income: computeDeltaPct(current.incomeEgp, previous.incomeEgp),
        expense: computeDeltaPct(current.expenseEgp, previous.expenseEgp),
        net: computeDeltaPct(current.netEgp, previous.netEgp),
      }
    : null;

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={Strings.transactions}
    >
      <Card
        testID="dashboard-transactions-card"
        className="border-border mx-4 mt-4 rounded-2xl border p-0 px-3 py-2"
        style={{
          gap: ms(8),
          boxShadow: 'none',
        }}
      >
        <View className="flex-row items-center justify-between" style={{ flexDirection: 'row' }}>
          <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: ms(22),
                height: ms(22),
                backgroundColor: SemanticTokens.info + '22',
              }}
            >
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={ms(13)}
                color={SemanticTokens.info}
              />
            </View>
            <Text variant="caption" className="font-inter-semibold text-foreground">
              {Strings.transactions}
            </Text>
          </View>
          <Text variant="caption" className="text-muted">
            {monthLabel}
          </Text>
        </View>

        {isLoading ? (
          <TransactionsCardSkeleton />
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
              {METRICS.map((metric) => (
                <MetricValue
                  key={metric.key}
                  value={formatSignedAmount(currentValue(current, metric.key), metric.key)}
                  label={metric.label}
                  align={metric.align}
                  className={metric.valueClass}
                />
              ))}
            </View>

            <View
              className="overflow-hidden rounded"
              style={{ height: ms(3), backgroundColor: Colors.dark.surfaceEl }}
              accessibilityLabel={Strings.totalsExpenseShareA11y(expensePct)}
            >
              <View
                className="bg-danger h-full rounded-[2px]"
                style={{ width: `${expensePct}%` }}
              />
            </View>

            {deltas ? (
              <>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  className="gap-2"
                  accessibilityLabel={
                    previousLabel ? Strings.totalsVsPrev(previousLabel) : undefined
                  }
                >
                  {METRICS.map((metric) => (
                    <DeltaValue
                      key={metric.key}
                      metric={metric.key}
                      deltaPct={deltas[metric.key]}
                      align={metric.align}
                    />
                  ))}
                </View>
                {previousLabel ? (
                  <Text className="font-inter-bold text-foreground/45 text-center text-[9px] tracking-wide uppercase">
                    {Strings.totalsVsPrev(previousLabel)}
                  </Text>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </Card>
    </PressableFeedback>
  );
}
