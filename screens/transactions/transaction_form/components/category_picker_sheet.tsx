import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ActionSheet, { type ActionSheetRef, FlatList } from 'react-native-actions-sheet';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { Category } from '@/database/entities/category.entity';

interface Props {
  visible: boolean;
  title: string;
  categories: Category[];
  selectedId?: string;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function CategoryPickerSheet({
  visible,
  title,
  categories,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  const sheetRef = useRef<ActionSheetRef>(null);

  useEffect(() => {
    if (visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [visible]);

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={onClose}
      gestureEnabled
      useBottomSafeAreaPadding={false}
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
      snapPoints={[80]}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <FlatList
          data={categories}
          keyExtractor={(c) => c.id}
          numColumns={3}
          columnWrapperStyle={styles.colWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.cell,
                  isSelected && styles.cellActive,
                  pressed && styles.cellPressed,
                ]}
                onPress={() => onSelect(item)}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '33' }]}>
                  <MaterialCommunityIcons
                    name={item.icon as MCIName}
                    size={ms(22)}
                    color={item.color}
                  />
                </View>
                <Text style={styles.label} numberOfLines={2}>
                  {item.name}
                </Text>
                {isSelected && (
                  <View style={styles.check}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={ms(14)}
                      color={Colors.shared.cairoGold}
                    />
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
  content: {
    paddingHorizontal: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  colWrapper: { gap: Spacing.xs, marginBottom: Spacing.xs },
  listContent: { paddingBottom: Spacing.lg },
  cell: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: Spacing.xxs,
  },
  cellActive: {
    borderColor: Colors.shared.cairoGold,
  },
  cellPressed: { opacity: 0.7 },
  iconBox: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  check: {
    position: 'absolute',
    top: Spacing.xxs,
    right: Spacing.xxs,
  },
});
