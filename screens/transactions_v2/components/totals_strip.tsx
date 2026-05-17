import React from 'react';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Text } from '@/components/ui/text';
import { computeDeltaPct, polarityColor, type TotalsMetric } from '../transactions.helpers';
import type { PeriodTotals } from '@/database/transactions';

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
      <Text className="font-inter font-semibold text-[9px] tracking-wide uppercase text-foreground/55">
        {label}
      </Text>
      <Text className={`font-sora font-bold text-[15px] mt-1 ${valueClass}`}>{value}</Text>
      {deltaPct !== null ? (
        <Text
          className={`font-inter text-[10px] mt-1 ${deltaColorClass(polarityColor(metric, deltaPct))}`}
        >
          {deltaLabel(deltaPct)}
        </Text>
      ) : null}
    </View>
  );
}

export function TotalsStrip({ current, previous, previousLabel }: Props): React.ReactElement {
  const incomeDelta = previous ? computeDeltaPct(current.incomeEgp, previous.incomeEgp) : null;
  const expenseDelta = previous ? computeDeltaPct(current.expenseEgp, previous.expenseEgp) : null;
  const netDelta = previous ? computeDeltaPct(current.netEgp, previous.netEgp) : null;

  return (
    <View className="px-4 mt-3">
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
        <Text className="text-center font-inter text-[9px] tracking-wide uppercase text-foreground/45 mt-2.5">
          {Strings.totalsVsPrev(previousLabel)}
        </Text>
      ) : null}
    </View>
  );
}
