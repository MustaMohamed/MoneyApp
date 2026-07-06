import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';

import {
  computeDeltaPct,
  deltaDisplay,
  expenseSharePct,
  formatSignedAmount,
  type DeltaDirection,
  type PolaritySignal,
  type TotalsMetric,
} from '../transactions.helpers';

interface Props {
  current: PeriodTotals;
  previous: PeriodTotals | null;
  previousLabel: string | null;
}

type Align = 'left' | 'center' | 'right';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

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
  if (polarity === 'good') return SemanticTokens.positive;
  if (polarity === 'bad') return SemanticTokens.negative;
  return CoreTokens.text2;
}

function directionIcon(direction: DeltaDirection): IconName {
  if (direction === 'up') return 'arrow-up';
  if (direction === 'down') return 'arrow-down';
  return 'minus';
}

function MetricLabel({ label, align }: { label: string; align: Align }): React.ReactElement {
  return (
    <Text
      className="font-inter text-muted text-[9px] font-bold tracking-wide uppercase"
      style={{ flex: 1, textAlign: align }}
      numberOfLines={1}
    >
      {label}
    </Text>
  );
}

function MetricValue({
  value,
  align,
  className,
}: {
  value: string;
  align: Align;
  className: string;
}): React.ReactElement {
  return (
    <Text
      className={`font-sora text-[14px] font-bold ${className}`}
      style={{ flex: 1, textAlign: align }}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
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
        <Text className="font-sora text-foreground/40 text-[12px] font-bold">—</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', justifyContent, alignItems: 'center' }}>
      <MaterialCommunityIcons
        name={directionIcon(delta.direction)}
        size={13}
        color={polarityColor(delta.polarity)}
      />
      <Text className={`font-sora ml-1 text-[12px] font-bold ${polarityClass(delta.polarity)}`}>
        {delta.label}
      </Text>
    </View>
  );
}

export function TotalsStrip({ current, previous, previousLabel }: Props): React.ReactElement {
  const expensePct = expenseSharePct(current);
  const deltas = previous
    ? {
        income: computeDeltaPct(current.incomeEgp, previous.incomeEgp),
        expense: computeDeltaPct(current.expenseEgp, previous.expenseEgp),
        net: computeDeltaPct(current.netEgp, previous.netEgp),
      }
    : null;

  return (
    <Card className="bg-surface border-border mx-4 mt-3 gap-2 rounded-2xl border px-4 py-3">
      <Text className="font-inter text-muted text-[10px] font-bold tracking-wide uppercase">
        {Strings.totalsMonthlyMovement}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
        {METRICS.map((metric) => (
          <MetricLabel key={metric.key} label={metric.label} align={metric.align} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
        {METRICS.map((metric) => (
          <MetricValue
            key={metric.key}
            value={formatSignedAmount(currentValue(current, metric.key), metric.key)}
            align={metric.align}
            className={metric.valueClass}
          />
        ))}
      </View>

      <View
        className="bg-default h-[5px] overflow-hidden rounded-full"
        accessibilityLabel={Strings.totalsExpenseShareA11y(expensePct)}
      >
        <View className="bg-danger h-full rounded-full" style={{ width: `${expensePct}%` }} />
      </View>

      {deltas ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
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
            <Text className="font-inter text-foreground/45 text-center text-[9px] font-bold tracking-wide uppercase">
              {Strings.totalsVsPrev(previousLabel)}
            </Text>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
