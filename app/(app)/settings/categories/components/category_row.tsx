import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import type { Category } from '@/store/category.store';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface CategoryRowProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}

export function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const isDefault = category.is_default === 1;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.iconBox, { backgroundColor: category.color + '22' }]}>
          <MaterialCommunityIcons
            name={category.icon as IconName}
            size={Size.iconSm}
            color={category.color}
          />
        </View>
        <Text style={styles.name}>{category.name}</Text>
      </View>

      <View style={styles.right}>
        {isDefault ? (
          <MaterialCommunityIcons
            name="lock-outline"
            size={Size.iconXs}
            color={Colors.dark.text2}
          />
        ) : (
          <View style={styles.actions}>
            <Pressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={Size.iconXs}
                color={Colors.dark.text2}
              />
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={Size.iconXs}
                color={Colors.dark.negative}
              />
            </Pressable>
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
  name: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
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
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
