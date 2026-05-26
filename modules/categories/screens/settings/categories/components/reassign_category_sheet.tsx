import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { PressableFeedback, Text } from 'heroui-native';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

import type { Category } from '@/modules/categories/store/category.store';
import { useReassignCategorySheetState } from './reassign_category_sheet.state';

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
      <Text
        className="font-inter-regular text-muted px-4 mb-1 text-base"
      >
        {Strings.categoriesReassignSubtitle(linkedCount)}
      </Text>
      <Text
        className="font-inter-regular text-muted px-4 mb-4 text-base"
      >
        {Strings.categoriesReassignBody}
      </Text>

      <BottomSheetFlatList
        data={options}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <PressableFeedback
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
            <Text className="font-inter-medium text-foreground flex-1 text-base">{item.name}</Text>
            {reassignState.selectedId === item.id && (
              <MaterialCommunityIcons
                name="check-circle"
                size={Size.iconXs}
                color={Colors.shared.cairoGold}
              />
            )}
          </PressableFeedback>
        )}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
});
