import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, PressableFeedback } from 'heroui-native';
import { Fragment, type ComponentProps } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, LetterSpacing, Size, Type, lineHeightFor } from '@/constants/theme';

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
          numberOfLines={1}
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
            numberOfLines={1}
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
  return (
    <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {index > 0 ? <View className="bg-border w-px" /> : null}
          <BudgetSummaryMetric item={item} />
        </Fragment>
      ))}
    </View>
  );
}

function BudgetSummaryMetric({ item }: { item: BudgetSummaryMetricItem }) {
  const metricClassName = 'flex-1 items-center justify-center px-1';
  const content = (
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
    >
      {content}
    </PressableFeedback>
  ) : (
    <View className={metricClassName}>{content}</View>
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
