import React from 'react';
import { Pressable, Text as RNText, View } from 'react-native';

import { Strings } from '@/constants/strings';
import type { DashboardSegment } from '@/screens/dashboard_v2/types';

interface SegmentSwitcherProps {
  value: DashboardSegment;
  onChange: (segment: DashboardSegment) => void;
}

const SEGMENTS: { key: DashboardSegment; label: string }[] = [
  { key: 'overview', label: Strings.dashboardSegmentOverview },
  { key: 'accounts', label: Strings.dashboardSegmentAccounts },
];

export function SegmentSwitcher({ value, onChange }: SegmentSwitcherProps) {
  return (
    <View
      className="flex-row bg-surface rounded-xl p-1 mx-4 mt-2 mb-2 border border-separator"
      accessibilityRole="tablist"
    >
      {SEGMENTS.map(({ key, label }) => {
        const active = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) onChange(key);
            }}
            className={
              'flex-1 items-center justify-center rounded-lg py-2 ' +
              (active ? 'bg-default' : '')
            }
          >
            <RNText
              className={
                active
                  ? 'text-foreground font-semibold text-[15px]'
                  : 'text-muted font-medium text-[12px]'
              }
            >
              {label}
            </RNText>
          </Pressable>
        );
      })}
    </View>
  );
}
