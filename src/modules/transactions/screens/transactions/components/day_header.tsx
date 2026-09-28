import { Skeleton } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, Spacing, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import type { TransactionDaySection } from '../transactions.helpers';
import { resolveDayHeaderGeometry } from './transactions_text.geometry';

const ROOT_STYLE = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: Spacing.md,
  paddingTop: Spacing.md,
  paddingBottom: Spacing.xs,
} as const;
const LABEL_STYLE = { flex: 1, minWidth: 0 } as const;
const FIGURES_STYLE = {
  flexShrink: 0,
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.xs,
  marginLeft: Spacing.xs,
} as const;
const PILL_STYLE = {
  backgroundColor: Colors.dark.goldTint,
  paddingVertical: Spacing.xxxs,
  paddingHorizontal: Spacing.xs,
} as const;
const SKELETON_WIDTH = ms(70);

interface Props {
  section: Pick<TransactionDaySection, 'label' | 'figures' | 'accessibilityLabel'>;
}

export const DayHeader = React.memo(function DayHeader({ section }: Props): React.ReactElement {
  const { fontSize, lineHeight, height } = resolveDayHeaderGeometry(
    useWindowDimensions().fontScale,
  );
  const textStyle = { fontSize, lineHeight: lineHeightFor(fontSize) };
  const { figures } = section;
  return (
    <View
      accessible
      accessibilityLabel={section.accessibilityLabel}
      className="bg-background"
      style={[ROOT_STYLE, { height }]}
    >
      <Text
        className="font-inter-semibold text-muted tracking-wide uppercase"
        style={[LABEL_STYLE, textStyle]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {section.label}
      </Text>
      <View style={FIGURES_STYLE}>
        {figures.mode === 'skeleton' ? (
          <Skeleton className="rounded-md" style={{ width: SKELETON_WIDTH, height: lineHeight }} />
        ) : (
          <Text
            className="font-sora text-content-secondary tabular-nums"
            style={textStyle}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {figures.mode === 'figures' ? `${figures.net} ${figures.currencyCode}` : figures.net}
          </Text>
        )}
        {figures.mode === 'figures' ? (
          <View className="rounded-full" style={PILL_STYLE}>
            <Text
              className="font-sora-bold"
              style={[textStyle, { color: Colors.shared.cairoGold }]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {figures.count}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});
