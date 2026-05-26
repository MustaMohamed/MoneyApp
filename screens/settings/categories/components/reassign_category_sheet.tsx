import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/bottom_sheet';
import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { useReassignCategorySheetState } from '@/screens/settings/categories/components/reassign_category_sheet.state';
import type { Category } from '@/store/category.store';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

interface ReassignCategorySheetProps {
  isOpen: boolean;
  categoryName: string;
  linkedCount: number;
  options: Category[];
  onConfirm: (toId: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function ReassignCategorySheet({
  isOpen,
  categoryName,
  linkedCount,
  options,
  onConfirm,
  onOpenChange,
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

  const handleClose = () => {
    useReassignCategorySheetState.getState().reset();
    onOpenChange(false);
  };

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

  const footer = (
    <Button
      testID="reassign-cta"
      variant="primary"
      label={Strings.categoriesReassignConfirm}
      isLoading={reassignState.isLoading}
      isDisabled={!reassignState.selectedId || reassignState.isLoading}
      onPress={() => void handleConfirm()}
    />
  );

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      title={Strings.categoriesReassignTitle(categoryName)}
      size="lg"
      scrollable
      footer={footer}
    >
      <Text style={styles.subtitle}>{Strings.categoriesReassignSubtitle(linkedCount)}</Text>
      <Text style={styles.body}>{Strings.categoriesReassignBody}</Text>

      <BottomSheetFlatList
        data={options}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedId(item.id)}
            style={[
              styles.optionRow,
              reassignState.selectedId === item.id && styles.optionRowActive,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: reassignState.selectedId === item.id }}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '22' }]}>
              <MaterialCommunityIcons
                name={toIconName(item.icon, 'tag-outline')}
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
    </Sheet>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  body: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: SHEET_FOOTER_CLEARANCE },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: 2,
  },
  optionRowActive: { backgroundColor: Colors.dark.surfaceEl },
  iconBox: {
    width: ms(32),
    height: ms(32),
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
});
