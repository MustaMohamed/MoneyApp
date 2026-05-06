import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { useReassignCategorySheetState } from '@/screens/settings/categories/components/reassign_category_sheet.state';
import type { Category } from '@/store/category.store';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface ReassignCategorySheetProps {
  visible: boolean;
  categoryName: string;
  options: Category[];
  onConfirm: (toId: string) => Promise<void>;
  onCancel: () => void;
}

export function ReassignCategorySheet({
  visible,
  categoryName,
  options,
  onConfirm,
  onCancel,
}: ReassignCategorySheetProps) {
  const {
    state: reassignState,
    setSelectedId,
    setIsLoading,
  } = useReassignCategorySheetState(
    useShallow((s) => ({
      state: s.state,
      setSelectedId: s.setSelectedId,
      setIsLoading: s.setIsLoading,
    })),
  );

  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%'], []);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
      useReassignCategorySheetState.getState().reset();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  const handleConfirm = async () => {
    if (!reassignState.selectedId) return;
    setIsLoading(true);
    try {
      await onConfirm(reassignState.selectedId);
    } finally {
      setIsLoading(false);
      setSelectedId(null);
    }
  };

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View style={styles.ctaWrap}>
          <Pressable
            onPress={handleConfirm}
            style={[
              styles.cta,
              (!reassignState.selectedId || reassignState.isLoading) && styles.ctaDisabled,
            ]}
            disabled={!reassignState.selectedId || reassignState.isLoading}
          >
            <Text style={styles.ctaText}>{Strings.categoriesReassignConfirm}</Text>
          </Pressable>
        </View>
      </BottomSheetFooter>
    ),
    [reassignState.selectedId, reassignState.isLoading],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      onDismiss={onCancel}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      footerComponent={renderFooter}
    >
      <BottomSheetFlatList
        data={options}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <Text style={styles.title}>{Strings.categoriesReassignTitle(categoryName)}</Text>
            <Text style={styles.body}>{Strings.categoriesReassignBody}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedId(item.id)}
            style={[
              styles.optionRow,
              reassignState.selectedId === item.id && styles.optionRowActive,
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '22' }]}>
              <MaterialCommunityIcons
                name={item.icon as IconName}
                size={Size.iconXs}
                color={item.color}
              />
            </View>
            <Text style={styles.optionName}>{item.name}</Text>
            {reassignState.selectedId === item.id && (
              <MaterialCommunityIcons
                name="check-circle"
                size={Size.iconXs}
                color={Colors.shared.cairoGold}
              />
            )}
          </Pressable>
        )}
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
  handle: { backgroundColor: Colors.dark.border, width: 36, height: 4 },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Size.ctaHeight + Spacing.lg + Spacing.md,
  },
  headerArea: { marginBottom: Spacing.md },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    marginBottom: Spacing.xs,
  },
  body: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: 2,
  },
  optionRowActive: { backgroundColor: Colors.dark.surfaceEl },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionName: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  ctaWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  cta: {
    height: Size.ctaHeight,
    borderRadius: Radius.cta,
    backgroundColor: Colors.shared.cairoGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
