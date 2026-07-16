import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, PressableFeedback } from 'heroui-native';
import { Fragment, type ComponentProps } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { LetterSpacing, Size, Type } from '@/constants/theme';

interface BudgetSummaryHeaderProps {
  eyebrowLabel: string;
  hasData: boolean;
  balanceLabel: string;
  balanceMetaLabel: string;
  balanceColor: string;
  emptyLabel?: string;
  trailingLabel?: string;
  trailingChipLabel?: string;
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
  hasData,
  balanceLabel,
  balanceMetaLabel,
  balanceColor,
  emptyLabel,
  trailingLabel,
  trailingChipLabel,
}: BudgetSummaryHeaderProps) {
  return (
    <>
      <Text
        style={{ fontSize: Type.meta, letterSpacing: LetterSpacing.eyebrow }}
        className="font-inter text-content-secondary font-semibold uppercase"
      >
        {eyebrowLabel}
      </Text>

      <View className="mt-0.5 flex-row items-center justify-between gap-3">
        {hasData ? (
          <Text
            style={{ color: balanceColor, fontSize: Type.summary }}
            className="font-sora shrink font-bold"
          >
            {balanceLabel}
            <Text
              style={{ fontSize: Type.meta }}
              className="font-inter text-content-secondary font-medium"
            >
              {' '}
              {balanceMetaLabel}
            </Text>
          </Text>
        ) : (
          <Text
            style={{ fontSize: Type.title }}
            className="font-sora text-foreground shrink font-bold"
          >
            {emptyLabel}
          </Text>
        )}
        {trailingChipLabel ? (
          <Chip
            accessibilityRole="text"
            size="sm"
            variant="soft"
            color="danger"
            animation="disable-all"
            className="min-h-7 px-2 py-0"
          >
            <Chip.Label
              style={{ fontSize: Type.meta }}
              className="font-inter font-semibold capitalize"
            >
              {trailingChipLabel}
            </Chip.Label>
          </Chip>
        ) : trailingLabel ? (
          <Text
            style={{ fontSize: Type.meta }}
            className="font-inter text-content-secondary shrink font-semibold"
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
    <View className="mt-0.5 flex-row items-center justify-between gap-3">
      <View className="flex-row gap-0.5">
        <Text
          style={{ fontSize: Type.bodyStrong }}
          className="font-inter text-foreground shrink font-semibold"
        >
          {spentLabel}
        </Text>
        <Text style={{ fontSize: Type.bodyStrong }} className="font-inter text-content-secondary">
          {connectorLabel}
        </Text>
        <Text
          style={{ fontSize: Type.bodyStrong }}
          className="font-inter text-foreground shrink font-semibold"
        >
          {plannedLabel}
        </Text>
      </View>
      <Text style={{ fontSize: Type.bodyStrong }} className="font-sora text-content-secondary">
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
        style={{ fontSize: Type.detail }}
        className="font-inter text-content-secondary text-center"
      >
        {item.label}
      </Text>
      <Text
        style={{ fontSize: Type.bodyStrong }}
        className={
          item.tone === 'warning'
            ? 'font-sora text-warning mt-px text-center font-semibold'
            : 'font-sora text-foreground mt-px text-center font-semibold'
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
        <View key={item.key} className="flex-1 flex-row items-center justify-center gap-0.5">
          <MaterialCommunityIcons
            accessible={false}
            name={item.icon}
            size={Size.iconXs}
            color={item.color}
          />
          <Text
            style={{ fontSize: Type.detail }}
            className="font-inter text-content-secondary shrink font-medium"
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
