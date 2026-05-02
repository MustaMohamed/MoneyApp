import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { Category } from '@/database/entities/category.entity';

interface Props {
  visible: boolean;
  categories: Category[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function FilterCategoryPicker({
  visible,
  categories,
  selectedIds,
  onToggle,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{Strings.filterPickCategoriesTitle}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.doneLabel}>{Strings.filterPickerDone}</Text>
          </Pressable>
        </View>
        <FlatList
          data={categories}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => {
            const checked = selectedIds.includes(item.id);
            const typeLabel =
              item.type === CategoryType.Income
                ? Strings.filterCategoryTypeIncome
                : Strings.filterCategoryTypeExpense;
            return (
              <Pressable
                onPress={() => onToggle(item.id)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                {/* item.color is always a 6-char #RRGGBB from AccountColors constants */}
                <View style={[styles.iconBox, { backgroundColor: item.color + '33' }]}>
                  <MaterialCommunityIcons
                    name={item.icon as MCIName}
                    size={ms(18)}
                    color={item.color}
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.caption}>{typeLabel}</Text>
                </View>
                <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                  {checked && (
                    <MaterialCommunityIcons
                      name="check"
                      size={ms(14)}
                      color={Colors.shared.midnightBlue}
                    />
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  handle: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  doneLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.shared.cairoGold,
  },
  sep: { height: 1, backgroundColor: Colors.dark.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  iconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  caption: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  checkbox: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(4),
    borderWidth: 1.5,
    borderColor: Colors.dark.text2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.shared.cairoGold,
    borderColor: Colors.shared.cairoGold,
  },
});
