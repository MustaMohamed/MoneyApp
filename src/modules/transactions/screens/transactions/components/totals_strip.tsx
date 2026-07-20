import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, Skeleton } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import { ms } from '@/utils/responsive';

import {
  buildTotalsPresentation,
  computeDeltaPct,
  deltaDisplay,
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
const TOTALS_VALUE_ROW_HEIGHT = ms(15);
const TOTALS_PROGRESS_HEIGHT = ms(3);
const TOTALS_DELTA_ROW_HEIGHT = ms(12);
const TOTALS_PREVIOUS_LABEL_HEIGHT = ms(9);

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

function TotalsSkeleton(): React.ReactElement {
  return (
    <>
      <View
        testID="transactions-totals-skeleton-values-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: ms(8),
          minHeight: TOTALS_VALUE_ROW_HEIGHT,
        }}
      >
        {METRICS.map((metric) => (
          <Skeleton
            key={metric.key}
            className="rounded-md"
            style={{ flex: 1, height: TOTALS_VALUE_ROW_HEIGHT }}
          />
        ))}
      </View>
      <Skeleton
        testID="transactions-totals-skeleton-progress"
        className="w-full rounded-[2px]"
        style={{ height: TOTALS_PROGRESS_HEIGHT }}
      />
      <View
        testID="transactions-totals-skeleton-deltas-row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: ms(8),
          minHeight: TOTALS_DELTA_ROW_HEIGHT,
        }}
      >
        {METRICS.map((metric) => (
          <View
            key={metric.key}
            testID="transactions-totals-skeleton-delta-pill"
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
              gap: ms(2),
            }}
          >
            <Skeleton className="rounded-full" style={{ width: ms(12), height: ms(12) }} />
            <Skeleton className="rounded-md" style={{ width: ms(28), height: ms(11) }} />
          </View>
        ))}
      </View>
      <Skeleton
        testID="transactions-totals-skeleton-previous-label"
        className="mx-auto w-24 rounded-md"
        style={{ height: TOTALS_PREVIOUS_LABEL_HEIGHT }}
      />
    </>
  );
}

export function TotalsStrip({
  current,
  previous,
  previousLabel,
  isLoading = false,
}: Props): React.ReactElement {
  const displayCurrent = current ?? EMPTY_TOTALS;
  const presentation = buildTotalsPresentation(displayCurrent);
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
        <TotalsSkeleton />
      ) : (
        <>
          <View
            testID="transactions-totals-values-row"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: TOTALS_VALUE_ROW_HEIGHT,
            }}
            className="gap-2"
          >
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
            testID="transactions-totals-progress"
            className={TRANSACTIONS_EXPENSE_SHARE_RAIL_CLASS_NAME}
            style={{ height: TOTALS_PROGRESS_HEIGHT }}
            accessibilityRole="progressbar"
            accessibilityLabel={presentation.accessibilityLabel}
            accessibilityValue={{
              min: 0,
              max: 100,
              now: presentation.railPct,
              text: presentation.accessibilityLabel,
            }}
          >
            <View
              className={`${presentation.railClassName} h-full rounded-[2px]`}
              style={{ width: `${presentation.railPct}%` }}
            />
            {presentation.hasOverflow ? (
              <View
                testID="transactions-totals-overflow-marker"
                className="bg-danger absolute top-0 right-0 h-full w-1 rounded-[2px]"
              />
            ) : null}
          </View>

          <View
            testID="transactions-totals-comparison-row"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: TOTALS_DELTA_ROW_HEIGHT,
            }}
            className="gap-2"
            accessibilityLabel={previousLabel ? Strings.totalsVsPrev(previousLabel) : undefined}
          >
            {METRICS.map((metric) => (
              <DeltaValue
                key={metric.key}
                metric={metric.key}
                deltaPct={deltas?.[metric.key] ?? null}
                align={metric.align}
              />
            ))}
          </View>

          <View
            testID="transactions-totals-caption"
            style={{
              minHeight: TOTALS_PREVIOUS_LABEL_HEIGHT,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              className={`font-inter text-[9px] font-bold ${presentation.captionClassName}`}
              numberOfLines={1}
            >
              {presentation.caption}
            </Text>
            {deltas && previousLabel ? (
              <Text className="font-inter text-foreground/45 text-[9px] font-bold uppercase">
                {Strings.totalsVsPrev(previousLabel)}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </Card>
  );
}
