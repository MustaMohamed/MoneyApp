import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, Menu, PressableFeedback, Text as HeroText } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, Size, TouchSize, Type } from '@/constants/theme';
import type { NamedBudgetVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';

interface NamedBudgetRowProps {
  budget: NamedBudgetVM;
  onEdit: (budgetId: string) => void;
  onDelete: (payload: { id: string; name: string }) => void;
}

export function NamedBudgetRow({ budget, onEdit, onDelete }: NamedBudgetRowProps) {
  return (
    <View className="border-separator bg-background/30 min-h-13 flex-row items-center gap-2 border-b px-4 py-1.5">
      <View
        accessible
        accessibilityLabel={budget.accessibilityLabel}
        className="flex-row items-center gap-2"
        style={{ flex: 1 }}
      >
        <View className="items-center" style={{ width: Size.budgetCategoryColumn }}>
          <BudgetRing
            pct={budget.usedPct ?? 0}
            color={budget.ringColor}
            size={Size.budgetNamedRing}
            stroke={Size.budgetRingStroke}
          >
            <HeroText
              style={{ fontSize: Type.chipMeta }}
              className="font-inter text-foreground font-bold"
            >
              {budget.usedLabel}
            </HeroText>
          </BudgetRing>
        </View>

        <View style={{ flex: 1 }}>
          <View className="flex-row items-start gap-1.5">
            <HeroText
              numberOfLines={2}
              style={{ fontSize: Type.caption }}
              className="font-sora text-foreground flex-1 font-semibold"
            >
              {budget.name}
            </HeroText>
            <Chip
              size="sm"
              variant="soft"
              color="default"
              className="h-5 py-0"
              style={{ flexShrink: 0 }}
              accessibilityRole="text"
              accessibilityLabel={budget.shareLabel}
            >
              <Chip.Label
                numberOfLines={1}
                style={{ fontSize: Type.chipMeta }}
                className="font-inter text-info font-semibold"
              >
                {budget.shareLabel}
              </Chip.Label>
            </Chip>
          </View>
          <HeroText style={{ fontSize: Type.micro }} className="font-inter text-muted mt-0.5">
            {budget.spentPlannedLabel}
          </HeroText>
        </View>

        <View className="min-w-12 items-end">
          <HeroText
            style={{ color: budget.ringColor, fontSize: Type.meta }}
            className="font-sora font-bold"
          >
            {budget.balanceAmountLabel}
          </HeroText>
          <HeroText style={{ fontSize: Type.chipMeta }} className="font-inter text-muted">
            {budget.balanceMetaLabel}
          </HeroText>
        </View>
      </View>

      <Menu>
        <Menu.Trigger asChild>
          <PressableFeedback
            accessibilityLabel={budget.menuAccessibilityLabel}
            accessibilityRole="button"
            className="items-center justify-center"
            style={{ minHeight: TouchSize.min, minWidth: TouchSize.min }}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={Size.iconSm}
              color={Colors.dark.text2}
            />
          </PressableFeedback>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Overlay />
          <Menu.Content
            presentation="popover"
            placement="bottom"
            align="end"
            width={Size.budgetActionMenuWidth}
            className="bg-surface border-border shadow-overlay rounded-lg border px-1 py-1"
          >
            <Menu.Item onPress={() => onEdit(budget.id)}>
              <Menu.ItemTitle>{Strings.swipeEdit}</Menu.ItemTitle>
            </Menu.Item>
            <Menu.Item
              variant="danger"
              onPress={() => onDelete({ id: budget.id, name: budget.name })}
            >
              <Menu.ItemTitle>{Strings.swipeDelete}</Menu.ItemTitle>
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu>
    </View>
  );
}
