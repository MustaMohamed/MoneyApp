import { Chip, Skeleton } from 'heroui-native';
import React from 'react';
import { Text as RNText, View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, Spacing, lineHeightFor } from '@/constants/theme';

import type { TransactionDaySection } from '../transactions.helpers';
import {
  DAY_HEADER_NET_PLACEHOLDER_WIDTH,
  DAY_HEADER_ROOT_STYLE,
  INTER_SEMIBOLD_ELLIPSIS_RESERVE_SCALE,
  resolveDayHeaderGeometry,
} from './transactions_text.geometry';

const LABEL_STYLE = { flex: 1, minWidth: 0 } as const;
const FIGURES_STYLE = {
  flexShrink: 0,
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.xs,
  marginLeft: Spacing.xs,
} as const;
const PILL_STYLE = {
  flexShrink: 0,
  alignSelf: 'center',
  backgroundColor: Colors.dark.goldTint,
  paddingVertical: 0,
  paddingHorizontal: Spacing.xs,
} as const;

interface Props {
  section: Pick<TransactionDaySection, 'label' | 'figures' | 'accessibilityLabel'>;
}

export const DayHeader = React.memo(function DayHeader({ section }: Props): React.ReactElement {
  const { fontSize, lineHeight, pillHeight, height } = resolveDayHeaderGeometry(
    useWindowDimensions().fontScale,
  );
  const textStyle = { fontSize, lineHeight: lineHeightFor(fontSize) };
  const reserveFontSize = fontSize * INTER_SEMIBOLD_ELLIPSIS_RESERVE_SCALE;
  const { figures } = section;
  return (
    <View
      accessible
      accessibilityLabel={section.accessibilityLabel}
      className="bg-background"
      style={[DAY_HEADER_ROOT_STYLE, { height }]}
    >
      {/* The outer size sets only the TextView's paint, so the `…` it reserves is as wide as the one Inter draws. */}
      <Text
        className="font-inter-semibold text-muted tracking-wide uppercase"
        style={[
          LABEL_STYLE,
          { fontSize: reserveFontSize, lineHeight: lineHeightFor(reserveFontSize) },
        ]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        <RNText style={textStyle} allowFontScaling={false}>
          {section.label}
        </RNText>
      </Text>
      <View style={FIGURES_STYLE}>
        {figures.mode === 'skeleton' ? (
          <Skeleton
            className="rounded-md"
            style={{ width: DAY_HEADER_NET_PLACEHOLDER_WIDTH, height: lineHeight }}
          />
        ) : (
          <Text
            className="font-sora text-content-secondary tabular-nums"
            style={textStyle}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {figures.net}
          </Text>
        )}
        {figures.mode === 'figures' ? (
          <Chip
            size="sm"
            variant="soft"
            color="accent"
            className="rounded-full"
            style={[PILL_STYLE, { height: pillHeight }]}
            pointerEvents="none"
            accessible={false}
            focusable={false}
          >
            <Chip.Label
              className="font-sora-bold"
              style={[textStyle, { color: Colors.shared.cairoGold }]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {figures.count}
            </Chip.Label>
          </Chip>
        ) : null}
      </View>
    </View>
  );
});
