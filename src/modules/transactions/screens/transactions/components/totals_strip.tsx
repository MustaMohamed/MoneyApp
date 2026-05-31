import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';

import { computeDeltaPct, polarityColor, type TotalsMetric } from '../transactions.helpers';

interface Props {
  current: PeriodTotals;
  previous: PeriodTotals | null;
  previousLabel: string | null;
}

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

function deltaLabel(deltaPct: number | null): string {
  if (deltaPct === null) return '';
  const arrow = deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : '·';
  return `${arrow} ${Math.abs(deltaPct)}%`;
}

function deltaColorClass(polarity: 'good' | 'bad' | 'neutral'): string {
  if (polarity === 'good') return 'text-success';
  if (polarity === 'bad') return 'text-danger';
  return 'text-foreground/50';
}

function Cell({
  label,
  value,
  valueClass,
  cellClass,
  deltaPct,
  metric,
}: {
  label: string;
  value: string;
  valueClass: string;
  cellClass: string;
  deltaPct: number | null;
  metric: TotalsMetric;
}): React.ReactElement {
  return (
    <View className={`flex-1 rounded-xl border px-3 py-2.5 ${cellClass}`}>
      <Text className="font-inter text-foreground/55 text-[9px] font-semibold tracking-wide uppercase">
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginTop: 4,
          gap: 6,
        }}
      >
        <Text
          className={`font-sora text-[15px] font-bold ${valueClass}`}
          style={{ flexShrink: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
        {deltaPct !== null ? (
          <Text
            className={`font-inter text-[10px] ${deltaColorClass(polarityColor(metric, deltaPct))}`}
          >
            {deltaLabel(deltaPct)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function TotalsStrip({ current, previous, previousLabel }: Props): React.ReactElement {
  const incomeDelta = previous ? computeDeltaPct(current.incomeEgp, previous.incomeEgp) : null;
  const expenseDelta = previous ? computeDeltaPct(current.expenseEgp, previous.expenseEgp) : null;
  const netDelta = previous ? computeDeltaPct(current.netEgp, previous.netEgp) : null;

  return (
    <View className="mt-3 px-4">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Cell
          label={Strings.totalsIncome}
          value={`+${numberFmt.format(current.incomeEgp)} EGP`}
          valueClass="text-success"
          cellClass="bg-success/8 border-success/20"
          deltaPct={incomeDelta}
          metric="income"
        />
        <Cell
          label={Strings.totalsExpense}
          value={`−${numberFmt.format(current.expenseEgp)} EGP`}
          valueClass="text-danger"
          cellClass="bg-danger/8 border-danger/20"
          deltaPct={expenseDelta}
          metric="expense"
        />
        <Cell
          label={Strings.totalsNet}
          value={`${current.netEgp >= 0 ? '+' : '−'}${numberFmt.format(Math.abs(current.netEgp))} EGP`}
          valueClass="text-accent"
          cellClass="bg-accent/8 border-accent/22"
          deltaPct={netDelta}
          metric="net"
        />
      </View>
      {previousLabel ? (
        <Text className="font-inter text-foreground/45 mt-2.5 text-center text-[9px] tracking-wide uppercase">
          {Strings.totalsVsPrev(previousLabel)}
        </Text>
      ) : null}
    </View>
  );
}
