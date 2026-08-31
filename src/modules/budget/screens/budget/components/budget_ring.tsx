import React from 'react';
import { View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';

import { Colors, Size } from '@/constants/theme';

export interface BudgetRingProps {
  /** Spend percentage 0..n. Values > 1 fill the full ring (capped). */
  pct: number;
  /** Fill colour for the progress arc. Use `budgetBandColor(pct)`. */
  color: string;
  /** Outer diameter in logical pixels. */
  size?: number;
  stroke?: number;
  /** Icon element centred inside the ring. */
  children: React.ReactNode;
}

export function BudgetRing({
  pct,
  color,
  size = Size.budgetCategoryColumn,
  stroke = Size.budgetRingStroke,
  children,
}: BudgetRingProps) {
  const radius = (size - stroke) / 2; // Insets half the stroke so it stays inside the viewBox.
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(pct, 0), 1);
  const dashOffset = circumference * (1 - clampedPct);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Rotated -90deg so the arc starts at 12 o'clock; absolute so the icon overlays it */}
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.dark.surfaceEl}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      {children}
    </View>
  );
}
