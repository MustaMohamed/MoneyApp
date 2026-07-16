import { View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { BudgetStatus } from '@/modules/budget/screens/budget/budget.helpers';
import { ms } from '@/utils/responsive';

const STATUS_COLOR: Record<BudgetStatus, string> = {
  under: Colors.dark.gold,
  warning: Colors.dark.warning,
  over: Colors.dark.negative,
};

export interface BudgetBarProps {
  pct: number;
  status: BudgetStatus;
  color?: string;
  height?: number;
}

export function BudgetBar({ pct, status, color, height = ms(7) }: BudgetBarProps) {
  const width = `${Math.min(Math.max(pct, 0), 1) * 100}%` as const;
  return (
    <View className="bg-default mt-1 overflow-hidden rounded-full" style={{ height }}>
      <View
        className="h-full rounded-full"
        style={{ width, backgroundColor: color ?? STATUS_COLOR[status] }}
      />
    </View>
  );
}
