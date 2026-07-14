import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import type { Category } from '@/modules/categories/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';

interface SpendingPlanCategorySelectorProps {
  selectedCategories: Category[];
  onPress: () => void;
}

export function SpendingPlanCategorySelector({
  selectedCategories,
  onPress,
}: SpendingPlanCategorySelectorProps) {
  const extraCount = Math.max(0, selectedCategories.length - 3);
  return (
    <>
      <Text className="font-inter text-muted mt-3 mb-2 text-[11px] font-medium">
        {Strings.budgetPlanCategories}
      </Text>
      <PressableFeedback
        accessibilityRole="button"
        accessibilityLabel={Strings.budgetPlanPickCategories}
        className="bg-default border-border min-h-[42px] flex-row items-center justify-between rounded-lg border px-3 py-1.5"
        onPress={onPress}
      >
        <View className="flex-1 flex-row flex-wrap items-center gap-1">
          {selectedCategories.slice(0, 3).map((category) => (
            <Chip key={category.id} size="sm" variant="soft" color="default" className="py-0">
              <MaterialCommunityIcons
                name={toIconName(category.icon, 'tag')}
                size={Size.iconMicro}
                color={category.color}
              />
              <Chip.Label>{category.name}</Chip.Label>
            </Chip>
          ))}
          {extraCount > 0 ? (
            <Chip size="sm" variant="soft" color="default" className="py-0">
              <Chip.Label>{Strings.budgetPlanMoreCategoriesCount(extraCount)}</Chip.Label>
            </Chip>
          ) : null}
          {selectedCategories.length === 0 ? (
            <Text className="font-inter text-muted text-[12px] font-semibold">
              {Strings.budgetPlanPickCategories}
            </Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={Size.iconXs} color={Colors.dark.text2} />
      </PressableFeedback>
    </>
  );
}
