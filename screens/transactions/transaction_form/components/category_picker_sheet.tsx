import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['70%'], []);

  useEffect(() => {
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={onClose}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetFlatList
        data={categories}
        keyExtractor={(c) => c.id}
        numColumns={3}
        columnWrapperStyle={styles.colWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.title}>{title}</Text>}
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
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    marginBottom: Spacing.sm,
  },
  colWrapper: { gap: Spacing.xs, marginBottom: Spacing.xs },
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
