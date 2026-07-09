import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { spendingPlanSheetStyles as styles } from '@/modules/budget/screens/budget/components/spending_plan_sheet.styles';
import type { Category } from '@/modules/categories/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

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
            <View key={category.id} style={styles.categoryChip}>
              <MaterialCommunityIcons
                name={toIconName(category.icon, 'tag')}
                size={ms(12)}
                color={category.color}
              />
              <Text style={styles.categoryChipText}>{category.name}</Text>
            </View>
          ))}
          {extraCount > 0 ? (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>
                {Strings.budgetPlanMoreCategoriesCount(extraCount)}
              </Text>
            </View>
          ) : null}
          {selectedCategories.length === 0 ? (
            <Text style={styles.pickerPlaceholder}>{Strings.budgetPlanPickCategories}</Text>
          ) : null}
        </View>
        <Text style={styles.chev}>{'›'}</Text>
      </PressableFeedback>
    </>
  );
}
