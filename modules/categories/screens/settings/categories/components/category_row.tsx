import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
// PROTECTED_CATEGORY_IDS intentionally not imported here — UI protection gate
// now uses category.is_default === 1 (see: fix/section-4-lock-all-defaults).
// The constant remains in constants/enums.ts as a documented historical artifact.
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

import type { Category } from '@/modules/categories/store/category.store';

interface CategoryRowProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  isDeleteDisabled?: boolean;
  /** When true, the bottom border divider is hidden. Use for the last row in each section. */
  isLast?: boolean;
}

export function CategoryRow({
  category,
  onEdit,
  onDelete,
  isDeleteDisabled,
  isLast = false,
}: CategoryRowProps) {
  const isProtected = category.is_default === 1;

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.left}>
        <View style={[styles.iconBox, { backgroundColor: category.color + '22' }]}>
          <MaterialCommunityIcons
            name={toIconName(category.icon, 'tag-outline')}
            size={Size.iconSm}
            color={category.color}
          />
        </View>
        <Text className="text-foreground font-inter-medium text-base">{category.name}</Text>
      </View>

      <View style={styles.right}>
        {isProtected ? (
          <MaterialCommunityIcons
            name="lock-outline"
            size={Size.iconXs}
            color={Colors.dark.text2}
          />
        ) : (
          <View style={styles.actions}>
            <PressableFeedback
              onPress={onEdit}
              hitSlop={8}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Edit category"
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={Size.iconXs}
                color={Colors.dark.text2}
              />
            </PressableFeedback>
            <PressableFeedback
              onPress={onDelete}
              hitSlop={8}
              style={styles.actionBtn}
              isDisabled={isDeleteDisabled}
              accessibilityRole="button"
              accessibilityLabel="Delete category"
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={Size.iconXs}
                color={isDeleteDisabled ? Colors.dark.text2 : Colors.dark.negative}
              />
            </PressableFeedback>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconBox: {
    width: Size.typeIconBox,
    height: Size.typeIconBox,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    width: ms(32),
    height: ms(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
