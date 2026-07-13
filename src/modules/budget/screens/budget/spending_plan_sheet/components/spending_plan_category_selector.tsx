import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip, PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import { spendingPlanSheetStyles as styles } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.styles';
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
      <Text style={styles.label}>{Strings.budgetPlanCategories}</Text>
      <PressableFeedback
        accessibilityRole="button"
        accessibilityLabel={Strings.budgetPlanPickCategories}
        style={styles.picker}
        onPress={onPress}
      >
        <View style={styles.pickerContent}>
          {selectedCategories.slice(0, 3).map((category) => (
            <Chip key={category.id} size="sm" variant="soft" color="default">
              <MaterialCommunityIcons
                name={toIconName(category.icon, 'tag')}
                size={Size.iconMicro}
                color={category.color}
              />
              <Chip.Label>{category.name}</Chip.Label>
            </Chip>
          ))}
          {extraCount > 0 ? (
            <Chip size="sm" variant="soft" color="default">
              <Chip.Label>{Strings.budgetPlanMoreCategoriesCount(extraCount)}</Chip.Label>
            </Chip>
          ) : null}
          {selectedCategories.length === 0 ? (
            <Text style={styles.pickerPlaceholder}>{Strings.budgetPlanPickCategories}</Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={Size.iconXs} color={Colors.dark.text2} />
      </PressableFeedback>
    </>
  );
}
