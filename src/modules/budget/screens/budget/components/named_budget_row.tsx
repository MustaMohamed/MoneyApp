import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, Menu, PressableFeedback, Typography } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import {
  resolveLoneWordLines,
  resolveRowStacking,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Colors, Size, Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import type { NamedBudgetVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';

// The ring's hole less 2 dp each side, so a label shrinks to fit rather than wrap onto the stroke.
const NAMED_RING_LABEL_MAX_WIDTH =
  Size.budgetNamedRing - 2 * (Size.budgetRingStroke + Spacing.xxxs);

interface NamedBudgetRowProps {
  budget: NamedBudgetVM;
  onEdit: (budgetId: string) => void;
  onDelete: (payload: { id: string; name: string }) => void;
}

export function NamedBudgetRow({ budget, onEdit, onDelete }: NamedBudgetRowProps) {
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
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
            <Typography
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontSize: Type.chipMeta,
                lineHeight: lineHeightFor(Type.chipMeta),
                maxWidth: NAMED_RING_LABEL_MAX_WIDTH,
                textAlign: 'center',
              }}
              className="font-inter-bold text-foreground"
            >
              {budget.usedLabel}
            </Typography>
          </BudgetRing>
        </View>

        <View style={{ flex: 1 }}>
          <View className={stacked ? undefined : 'flex-row items-start gap-1.5'}>
            <Typography
              numberOfLines={resolveLoneWordLines(budget.name, 2)}
              allowFontScaling={false}
              style={scaledTextStyle(Type.caption, fontScale)}
              className={
                stacked
                  ? 'font-sora-semibold text-foreground'
                  : 'font-sora-semibold text-foreground flex-1'
              }
            >
              {budget.name}
            </Typography>
            <Chip
              size="sm"
              variant="soft"
              color="default"
              className="min-h-5 py-0"
              style={
                stacked ? { alignSelf: 'flex-start', marginTop: Spacing.xxxs } : { flexShrink: 0 }
              }
              accessibilityRole="text"
              accessibilityLabel={budget.shareLabel}
            >
              <Chip.Label
                numberOfLines={1}
                style={{ fontSize: Type.chipMeta, lineHeight: lineHeightFor(Type.chipMeta) }}
                className="font-inter-semibold text-info"
              >
                {budget.shareLabel}
              </Chip.Label>
            </Chip>
          </View>
          <Typography
            style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
            className="font-inter text-muted mt-0.5"
          >
            {budget.spentPlannedLabel}
          </Typography>
        </View>

        <View className="min-w-12 items-end">
          <Typography
            style={{
              color: budget.ringColor,
              fontSize: Type.meta,
              lineHeight: lineHeightFor(Type.meta),
            }}
            className="font-sora-bold"
          >
            {budget.balanceAmountLabel}
          </Typography>
          <Typography
            style={{ fontSize: Type.chipMeta, lineHeight: lineHeightFor(Type.chipMeta) }}
            className="font-inter text-muted"
          >
            {budget.balanceMetaLabel}
          </Typography>
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
