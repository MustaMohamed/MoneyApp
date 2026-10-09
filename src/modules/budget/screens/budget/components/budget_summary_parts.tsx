import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, PressableFeedback } from 'heroui-native';
import { Fragment, type ComponentProps } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { resolveFitAmountTextProps, resolveRowStacking } from '@/components/ui/text_scale.geometry';
import { Colors, LetterSpacing, Size, TouchSize, Type, lineHeightFor } from '@/constants/theme';

// Half the stacked metric row at most, so a label word keeps its line beside a long value.
const STACKED_METRIC_VALUE_MAX_WIDTH = '50%';
const STACKED_METRIC_ROW_STYLE = { flexDirection: 'row', alignItems: 'center' } as const;
const STACKED_METRIC_PRESSABLE_STYLE = {
  ...STACKED_METRIC_ROW_STYLE,
  minHeight: TouchSize.min,
} as const;

interface BudgetSummaryHeaderProps {
  eyebrowLabel: string;
  eyebrowTrailingLabel?: string;
  hasData: boolean;
  balanceLabel: string;
  balanceMetaLabel: string;
  balanceColor: string;
  emptyLabel?: string;
  trailingLabel?: string;
  trailingChipLabel?: string;
  trailingActionLabel?: string;
  trailingActionAccessibilityLabel?: string;
  onTrailingAction?: () => void;
}

interface BudgetSummaryMetricItem {
  key: string;
  label: string;
  value: string;
  tone?: 'default' | 'warning';
  onPress?: () => void;
  accessibilityLabel?: string;
}

interface BudgetSummaryStatusItem {
  key: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  label: string;
}

export function BudgetSummaryHeader({
  eyebrowLabel,
  eyebrowTrailingLabel,
  hasData,
  balanceLabel,
  balanceMetaLabel,
  balanceColor,
  emptyLabel,
  trailingLabel,
  trailingChipLabel,
  trailingActionLabel,
  trailingActionAccessibilityLabel,
  onTrailingAction,
}: BudgetSummaryHeaderProps) {
  const { fontScale } = useWindowDimensions();
  // Above font scale 1 the eyebrow and the trailing label wrap between words, where one line cut inside a word.
  const labelLines = fontScale > 1 ? 2 : 1;
  return (
    <>
      <View className="flex-row items-center justify-between gap-2">
        <Text
          style={{
            fontSize: Type.meta,
            lineHeight: lineHeightFor(Type.meta),
            letterSpacing: LetterSpacing.eyebrow,
          }}
          className="font-inter-semibold text-content-secondary shrink uppercase"
          numberOfLines={labelLines}
        >
          {eyebrowLabel}
        </Text>
        {eyebrowTrailingLabel ? (
          <Text
            style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
            className="font-inter-semibold text-content-secondary shrink-0"
            numberOfLines={1}
          >
            {eyebrowTrailingLabel}
          </Text>
        ) : null}
      </View>

      <View className="mt-0.5 min-h-8 flex-row items-center justify-between gap-3">
        {hasData ? (
          <Text
            style={{
              color: balanceColor,
              fontSize: Type.summary,
              lineHeight: lineHeightFor(Type.summary),
            }}
            className="font-sora-bold shrink"
            numberOfLines={2}
          >
            {balanceLabel}
            <Text
              style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
              className="font-inter-medium text-content-secondary"
            >
              {' '}
              {balanceMetaLabel}
            </Text>
          </Text>
        ) : (
          <Text
            style={{ fontSize: Type.title, lineHeight: lineHeightFor(Type.title) }}
            className="font-sora-bold text-foreground flex-1"
            numberOfLines={2}
          >
            {emptyLabel}
          </Text>
        )}
        {trailingActionLabel && onTrailingAction ? (
          <View className="shrink-0 flex-row items-center gap-1.5">
            {trailingLabel ? (
              <Text
                style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
                className="font-inter-semibold text-content-secondary shrink"
                numberOfLines={1}
              >
                {trailingLabel}
              </Text>
            ) : null}
            <PressableFeedback
              accessibilityRole="button"
              accessibilityLabel={trailingActionAccessibilityLabel ?? trailingActionLabel}
              onPress={onTrailingAction}
              className="bg-default min-h-7 flex-row items-center gap-1 rounded-lg px-2"
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={Size.iconMicro}
                color={Colors.dark.gold}
              />
              <Text
                style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
                className="font-inter-semibold text-accent"
              >
                {trailingActionLabel}
              </Text>
            </PressableFeedback>
          </View>
        ) : trailingChipLabel ? (
          <Chip
            accessibilityRole="text"
            size="sm"
            variant="soft"
            color="danger"
            animation="disable-all"
            className="min-h-7 px-2 py-0"
          >
            <Chip.Label
              style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
              className="font-inter-semibold capitalize"
            >
              {trailingChipLabel}
            </Chip.Label>
          </Chip>
        ) : trailingLabel ? (
          <Text
            style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
            className="font-inter-semibold text-content-secondary shrink"
            numberOfLines={labelLines}
          >
            {trailingLabel}
          </Text>
        ) : null}
      </View>
    </>
  );
}

export function BudgetSummarySpentRow({
  spentLabel,
  connectorLabel,
  plannedLabel,
  usedLabel,
}: {
  spentLabel: string;
  connectorLabel: string;
  plannedLabel: string;
  usedLabel: string;
}) {
  return (
    <View className="mt-0.5 flex-row items-center justify-between gap-2">
      <Text
        style={{ flex: 1, fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
        className="font-inter-medium text-content-secondary"
        numberOfLines={2}
      >
        <Text className="font-inter-semibold text-foreground">{spentLabel}</Text>
        {connectorLabel ? ` ${connectorLabel} ` : ''}
        {plannedLabel ? (
          <Text className="font-inter-semibold text-foreground">{plannedLabel}</Text>
        ) : null}
      </Text>
      <Text
        style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
        className="font-sora text-content-secondary shrink-0"
        numberOfLines={1}
      >
        {usedLabel}
      </Text>
    </View>
  );
}

export function BudgetSummaryMetricsRow({ items }: { items: BudgetSummaryMetricItem[] }) {
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  return (
    <View
      testID="budget-summary-metrics"
      className={
        stacked
          ? 'border-border mt-1.5 border-t pt-1'
          : 'border-border mt-1.5 flex-row items-stretch border-t pt-1'
      }
    >
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 ? <View className={stacked ? 'bg-border h-px' : 'bg-border w-px'} /> : null}
          <BudgetSummaryMetric item={item} />
        </Fragment>
      ))}
    </View>
  );
}

function BudgetSummaryMetric({ item }: { item: BudgetSummaryMetricItem }) {
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const metricClassName = stacked ? 'gap-2 px-1 py-1' : 'flex-1 items-center justify-center px-1';
  const valueText = resolveFitAmountTextProps(Type.bodyStrong, fontScale);
  const content = stacked ? (
    <>
      <Text
        style={{ flex: 1, fontSize: Type.detail, lineHeight: lineHeightFor(Type.detail) }}
        className="font-inter text-content-secondary"
      >
        {item.label}
      </Text>
      <Text
        {...valueText}
        style={{ ...valueText.style, flexShrink: 0, maxWidth: STACKED_METRIC_VALUE_MAX_WIDTH }}
        className={
          item.tone === 'warning'
            ? 'font-sora-semibold text-warning text-right'
            : 'font-sora-semibold text-foreground text-right'
        }
      >
        {item.value}
      </Text>
    </>
  ) : (
    <>
      <Text
        style={{ fontSize: Type.detail, lineHeight: lineHeightFor(Type.detail) }}
        className="font-inter text-content-secondary text-center"
      >
        {item.label}
      </Text>
      <Text
        style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
        className={
          item.tone === 'warning'
            ? 'font-sora-semibold text-warning mt-px text-center'
            : 'font-sora-semibold text-foreground mt-px text-center'
        }
      >
        {item.value}
      </Text>
    </>
  );

  return item.onPress ? (
    <PressableFeedback
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      onPress={item.onPress}
      className={metricClassName}
      style={stacked ? STACKED_METRIC_PRESSABLE_STYLE : undefined}
    >
      {content}
    </PressableFeedback>
  ) : (
    <View className={metricClassName} style={stacked ? STACKED_METRIC_ROW_STYLE : undefined}>
      {content}
    </View>
  );
}

export function BudgetSummaryStatusRow({ items }: { items: BudgetSummaryStatusItem[] }) {
  return (
    <View className="mt-1.5 flex-row items-center">
      {items.map((item) => (
        <View
          key={item.key}
          className="min-h-8 flex-1 flex-row items-center justify-center gap-0.5"
        >
          <MaterialCommunityIcons
            accessible={false}
            name={item.icon}
            size={Size.iconXs}
            color={item.color}
          />
          <Text
            style={{ fontSize: Type.detail, lineHeight: lineHeightFor(Type.detail) }}
            numberOfLines={2}
            className="font-inter-medium text-content-secondary shrink text-center"
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
