import React from 'react';
import { View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';

import { Colors, Size } from '@/constants/theme';

export interface BudgetRingProps {
  /** Spend percentage 0..n. Values > 1 fill the full ring (capped). */
  pct: number;
  /** Fill colour for the progress arc. Use budgetBandColor(pct). */
  color: string;
  /** Outer diameter in logical pixels. Defaults to the category-column token. */
  size?: number;
  /** Stroke width. Defaults to the shared budget-ring token. */
  stroke?: number;
  /** Icon element centred inside the ring. */
  children: React.ReactNode;
}

/**
 * BudgetRing — circular progress ring around a category icon.
 *
 * Team Law 7 justification: HeroUI Native has no SVG ring/progress-circle
 * primitive. This uses react-native-svg (already installed) exactly as the
 * existing SVG textures do. Not a critical-trigger violation.
 *
 * Geometry:
 *   radius = (size / 2) - (stroke / 2)   ← so the stroke stays within the viewBox
 *   circumference = 2π × radius
 *   dashoffset = circumference × (1 - clamp(pct, 0, 1))
 *
 * The track circle uses Colors.dark.surfaceEl (muted grey ring track).
 * The progress arc uses the caller-supplied `color`.
 * Rotation is -90° so the arc starts at 12 o'clock.
 */
export function BudgetRing({
  pct,
  color,
  size = Size.budgetCategoryColumn,
  stroke = Size.budgetRingStroke,
  children,
}: BudgetRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(pct, 0), 1);
  const dashOffset = circumference * (1 - clampedPct);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* SVG ring — absolute so the children (icon) overlay it */}
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.dark.surfaceEl}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress arc */}
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
      {/* Icon slot — centred inside the ring */}
      {children}
    </View>
  );
}
