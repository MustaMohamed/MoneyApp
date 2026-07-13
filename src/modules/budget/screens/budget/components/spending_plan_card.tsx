import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, Chip, PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, Size, Spacing } from '@/constants/theme';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import { SpendingPlanAllocationChip } from '@/modules/budget/screens/budget/components/spending_plan_allocation_chip';
import { SpendingPlanCategoryChip } from '@/modules/budget/screens/budget/components/spending_plan_category_chip';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.types';

interface SpendingPlanCardProps {
  row: SpendingPlanRowVM;
  onOpenDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (plan: { id: string; name: string }) => void;
}

export function SpendingPlanCard({ row, onOpenDetails, onEdit, onDelete }: SpendingPlanCardProps) {
  return (
    <Card
      variant="default"
      className="bg-surface border-border mx-4 mt-2 overflow-hidden rounded-lg border px-2 py-2"
    >
      <PressableFeedback
        accessibilityRole="button"
        accessibilityLabel={row.card.openDetailsAccessibilityLabel}
        animation={false}
        onPress={() => onOpenDetails(row.id)}
        className="absolute inset-0 rounded-2xl"
      >
        <PressableFeedback.Highlight />
      </PressableFeedback>

      <Card.Header pointerEvents="none" className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Card.Title
              className="font-sora text-foreground -mt-0.5 max-w-[70%] shrink text-[14px] font-semibold"
              numberOfLines={1}
            >
              {row.name}
            </Card.Title>
            <Chip
              size="sm"
              variant="soft"
              color={row.card.statusTone}
              animation="disable-all"
              accessibilityRole="text"
              accessibilityLabel={row.card.statusLabel}
              className="min-h-[18px] px-2 py-0"
            >
              <Chip.Label className="font-inter text-[7.5px] font-semibold capitalize">
                {row.card.statusLabel}
              </Chip.Label>
            </Chip>
          </View>
          <Card.Description className="font-inter text-muted -mt-1 text-[9px]" numberOfLines={1}>
            {row.card.dateLabel}
          </Card.Description>
        </View>
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={row.card.balanceAccessibilityLabel}
          className="items-end"
        >
          <Text
            className="font-sora text-[14px] font-bold"
            style={{ color: row.card.balanceColor }}
          >
            {row.card.balanceAmountLabel}
          </Text>
          <Text className="font-inter text-muted text-[7.5px]">{row.card.balanceMetaLabel}</Text>
        </View>
      </Card.Header>

      <Card.Body pointerEvents="none" className="mt-0.5">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="font-inter text-foreground shrink text-[9px] font-medium">
            {row.card.spentLabel}
          </Text>
          <Text className="font-inter text-muted text-[9px] font-semibold">
            {row.card.percentageLabel}
          </Text>
        </View>

        <View className="relative mt-1 justify-center">
          <BudgetBar
            pct={row.pct}
            status={row.card.progressStatus}
            color={row.card.progressColor}
            height={Size.spendingPlanProgressTrack}
          />
          {row.card.elapsedMarkerPercentage !== undefined &&
          row.card.elapsedMarkerColor !== undefined ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              className="absolute -top-0.5 h-2 w-0.5 rounded-lg"
              style={{
                left: `${row.card.elapsedMarkerPercentage}%`,
                backgroundColor: row.card.elapsedMarkerColor,
                transform: [{ translateX: -Spacing.xxxs }],
              }}
            />
          ) : null}
        </View>

        {row.card.paceLabel === undefined ? null : (
          <Text className="font-inter text-muted mt-1 text-[9px] font-medium">
            {row.card.paceLabel}
          </Text>
        )}

        <View className="mt-1 flex-row flex-wrap gap-1">
          {row.card.chips.map((chip) => {
            if (chip.type === 'allocation') {
              return <SpendingPlanAllocationChip key={chip.id} allocation={chip.allocation} />;
            }
            if (chip.type === 'category') {
              return <SpendingPlanCategoryChip key={chip.id} category={chip.category} />;
            }
            return (
              <Chip
                key={chip.id}
                size="sm"
                variant="secondary"
                color="default"
                animation="disable-all"
                accessibilityRole="text"
                accessibilityLabel={chip.accessibilityLabel}
                className="bg-background min-h-6 rounded-full px-2 py-0"
              >
                <Chip.Label className="font-inter text-foreground text-[11px] font-semibold">
                  {chip.label}
                </Chip.Label>
              </Chip>
            );
          })}
        </View>
      </Card.Body>

      <Card.Footer
        pointerEvents="box-none"
        className="border-border mt-0.5 flex-row items-center justify-between gap-3 border-t pt-0.5"
      >
        <Text
          pointerEvents="none"
          className="font-inter text-muted flex-1 text-[7.5px]"
          numberOfLines={1}
        >
          {row.card.allocationFooterLabel}
        </Text>
        <View className="flex-row items-center gap-1">
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={`${Strings.budgetPlanEditTitle} ${row.name}`}
            onPress={() => onEdit(row.id)}
            className="h-6 w-6 items-center justify-center"
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={Size.iconXs}
              color={Colors.dark.text2}
            />
          </PressableFeedback>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={`${Strings.budgetPlansRemoveA11y} ${row.name}`}
            onPress={() => onDelete({ id: row.id, name: row.name })}
            className="h-6 w-6 items-center justify-center"
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={Size.iconXs}
              color={Colors.dark.text2}
            />
          </PressableFeedback>
        </View>
      </Card.Footer>
    </Card>
  );
}
