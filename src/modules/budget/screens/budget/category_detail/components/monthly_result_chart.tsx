import { Typography } from 'heroui-native';
import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Line, Svg } from 'react-native-svg';

import { ListCard } from '@/components/ui/list_card';
import {
  SECTION_HEADER_MARGIN_BOTTOM,
  SECTION_HEADER_MARGIN_TOP,
} from '@/components/ui/section_header.geometry';
import { Text } from '@/components/ui/text';
import {
  deviceLineHeight,
  resolveFitAmountTextProps,
  resolveOneLineTextProps,
  resolveRowStacking,
  scaledTextStyle,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import {
  Colors,
  FontFamily,
  Radius,
  Size,
  Spacing,
  Type,
  lineHeightFor,
  withAlpha,
} from '@/constants/theme';
import type { CategoryHistoryVM } from '@/modules/budget/screens/budget/budget.helpers';
import { BUDGET_CHART_LABEL_MAX_FONT_SCALE } from '@/modules/budget/screens/budget/budget_text.geometry';
import { buildMonthlyResult } from '@/modules/budget/screens/budget/category_detail/components/monthly_result_chart.helpers';

const AMOUNT_GAP = Spacing.xxs;
const LIMIT_LINE_Y = Size.budgetMonthlyLimitStroke / 2;

export function MonthlyResultChart({
  history,
  month,
}: {
  history: CategoryHistoryVM;
  month: string;
}) {
  const { bars, limitOffsetDp, legend } = buildMonthlyResult(history.results, month);
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const titleLine = resolveOneLineTextProps(scaledTextStyle(Type.caption, fontScale));
  const amountText = resolveFitAmountTextProps(Type.compactBadge, fontScale);
  // Above font scale 1 the labels share one size up to the stop, and the fit only takes a label still wider than its column.
  const labelText = scaledTextStyleAboveOne(
    Type.overline,
    fontScale,
    BUDGET_CHART_LABEL_MAX_FONT_SCALE,
  );
  const barRowMinHeight =
    Size.budgetMonthlyBarMaxHeight + deviceLineHeight(Type.compactBadge, fontScale) + AMOUNT_GAP;
  return (
    <View>
      <View style={stacked ? styles.headerStacked : styles.headerRow}>
        <Typography
          {...titleLine}
          className="font-inter-semibold text-muted tracking-wide uppercase"
          style={stacked ? titleLine.style : { ...titleLine.style, flex: 1 }}
        >
          {Strings.budgetDetailMonthlyResult}
        </Typography>
        {legend !== undefined && <Text style={styles.legend}>{legend}</Text>}
      </View>
      <ListCard>
        <View style={styles.body}>
          <View style={[styles.barRow, { minHeight: barRowMinHeight }]}>
            {bars.map((bar) => (
              <View key={bar.yearMonth} style={styles.column}>
                <Text
                  {...amountText}
                  style={[
                    styles.amount,
                    amountText.style,
                    {
                      color: bar.amountColor,
                      fontFamily:
                        bar.isOver || bar.isSelected ? FontFamily.soraSemi : FontFamily.soraRegular,
                    },
                  ]}
                >
                  {bar.amountLabel}
                </Text>
                <View style={[styles.bar, { height: bar.heightDp, backgroundColor: bar.color }]} />
              </View>
            ))}
            {limitOffsetDp !== undefined && (
              <Svg
                width="100%"
                height={Size.budgetMonthlyLimitStroke}
                pointerEvents="none"
                style={[styles.limitLine, { bottom: limitOffsetDp }]}
              >
                <Line
                  x1={0}
                  y1={LIMIT_LINE_Y}
                  x2="100%"
                  y2={LIMIT_LINE_Y}
                  stroke={withAlpha(Colors.dark.text1, '66')}
                  strokeWidth={Size.budgetMonthlyLimitStroke}
                  strokeDasharray={[Size.budgetMonthlyLimitDash, Size.budgetMonthlyLimitDash]}
                />
              </Svg>
            )}
          </View>
          <View style={styles.monthRow}>
            {bars.map((bar) => (
              <Text
                key={bar.yearMonth}
                style={[styles.month, bar.isSelected && styles.monthSelected, labelText]}
                numberOfLines={labelText ? 1 : undefined}
                allowFontScaling={labelText === undefined}
                adjustsFontSizeToFit={labelText !== undefined}
              >
                {bar.monthLabel}
              </Text>
            ))}
          </View>
        </View>
      </ListCard>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: SECTION_HEADER_MARGIN_TOP,
    marginBottom: SECTION_HEADER_MARGIN_BOTTOM,
  },
  headerStacked: {
    gap: Spacing.xxs,
    marginTop: SECTION_HEADER_MARGIN_TOP,
    marginBottom: SECTION_HEADER_MARGIN_BOTTOM,
  },
  legend: {
    fontFamily: FontFamily.soraRegular,
    fontSize: Type.caption,
    lineHeight: lineHeightFor(Type.caption),
    color: Colors.dark.text2,
  },
  body: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  barRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Size.budgetMonthlyColumnGap,
  },
  column: { flex: 1, alignItems: 'center' },
  amount: {
    alignSelf: 'stretch',
    textAlign: 'center',
    marginBottom: AMOUNT_GAP,
  },
  bar: {
    width: '100%',
    maxWidth: Size.budgetMonthlyBarMaxWidth,
    borderTopLeftRadius: Size.budgetMonthlyBarRadius,
    borderTopRightRadius: Size.budgetMonthlyBarRadius,
    borderBottomLeftRadius: Radius.xs,
    borderBottomRightRadius: Radius.xs,
  },
  limitLine: { position: 'absolute', left: 0, right: 0 },
  monthRow: {
    flexDirection: 'row',
    gap: Size.budgetMonthlyColumnGap,
    marginTop: Spacing.xxs,
  },
  month: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.interRegular,
    fontSize: Type.overline,
    lineHeight: lineHeightFor(Type.overline),
    color: Colors.dark.text2,
  },
  monthSelected: { fontFamily: FontFamily.interSemi, color: Colors.dark.text1 },
});
