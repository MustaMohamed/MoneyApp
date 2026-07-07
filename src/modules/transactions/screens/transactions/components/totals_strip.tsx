import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, SkeletonGroup } from 'heroui-native';
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
  current: PeriodTotals | null;
  previous: PeriodTotals | null;
  previousLabel: string | null;
  isLoading?: boolean;
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

export const TRANSACTIONS_TOTALS_CARD_CLASS_NAME =
  'bg-surface border-border mx-4 mb-2 gap-1 rounded-2xl border px-4 py-2';

export const TRANSACTIONS_EXPENSE_SHARE_RAIL_CLASS_NAME =
  'bg-default h-[3px] overflow-hidden rounded-[2px]';

const EMPTY_TOTALS: PeriodTotals = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };

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
      className={`font-sora text-[14px] font-bold ${className}`}
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
        <Text className="font-sora text-foreground/40 text-[11px] font-bold">—</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', justifyContent, alignItems: 'center' }}>
      <MaterialCommunityIcons
        name={directionIcon(delta.direction)}
        size={12}
        color={polarityColor(delta.polarity)}
      />
      <Text className={`font-sora ml-0.5 text-[11px] font-bold ${polarityClass(delta.polarity)}`}>
        {delta.label}
      </Text>
    </View>
  );
}

function TotalsSkeleton({ previousLabel }: { previousLabel: string | null }): React.ReactElement {
  return (
    <SkeletonGroup isLoading isSkeletonOnly className="gap-1">
      <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
        {METRICS.map((metric) => (
          <SkeletonGroup.Item key={metric.key} className="h-5 rounded-md" style={{ flex: 1 }} />
        ))}
      </View>
      <SkeletonGroup.Item className="h-[3px] w-full rounded-[2px]" />
      <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
        {METRICS.map((metric) => (
          <SkeletonGroup.Item key={metric.key} className="h-4 rounded-md" style={{ flex: 1 }} />
        ))}
      </View>
      {previousLabel ? <SkeletonGroup.Item className="mx-auto h-3 w-24 rounded-md" /> : null}
    </SkeletonGroup>
  );
}

export function TotalsStrip({
  current,
  previous,
  previousLabel,
  isLoading = false,
}: Props): React.ReactElement {
  const displayCurrent = current ?? EMPTY_TOTALS;
  const expensePct = expenseSharePct(displayCurrent);
  const deltas =
    previous && current
      ? {
          income: computeDeltaPct(current.incomeEgp, previous.incomeEgp),
          expense: computeDeltaPct(current.expenseEgp, previous.expenseEgp),
          net: computeDeltaPct(current.netEgp, previous.netEgp),
        }
      : null;

  return (
    <Card className={TRANSACTIONS_TOTALS_CARD_CLASS_NAME}>
      {isLoading ? (
        <TotalsSkeleton previousLabel={previousLabel} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-2">
            {METRICS.map((metric) => (
              <MetricValue
                key={metric.key}
                value={formatSignedAmount(currentValue(displayCurrent, metric.key), metric.key)}
                label={metric.label}
                align={metric.align}
                className={metric.valueClass}
              />
            ))}
          </View>

          <View
            className={TRANSACTIONS_EXPENSE_SHARE_RAIL_CLASS_NAME}
            accessibilityLabel={Strings.totalsExpenseShareA11y(expensePct)}
          >
            <View className="bg-danger h-full rounded-[2px]" style={{ width: `${expensePct}%` }} />
          </View>

          {deltas ? (
            <>
              <View
                style={{ flexDirection: 'row', alignItems: 'center' }}
                className="gap-2"
                accessibilityLabel={previousLabel ? Strings.totalsVsPrev(previousLabel) : undefined}
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
                <Text className="font-inter text-foreground/45 text-center text-[9px] font-bold tracking-wide uppercase">
                  {Strings.totalsVsPrev(previousLabel)}
                </Text>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </Card>
  );
}
