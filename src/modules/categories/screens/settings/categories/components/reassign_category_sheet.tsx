import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { PressableFeedback, Typography } from 'heroui-native';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import type { Category } from '@/modules/categories/store/category.store';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

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
  const { selectedId, isLoading, errorMessage } = useReassignCategorySheetState(
    useShallow((s) => ({
      selectedId: s.selectedId,
      isLoading: s.isLoading,
      errorMessage: s.errorMessage,
    })),
  );
  const setSelectedId = useReassignCategorySheetState.getState().setSelectedId;
  const setIsLoading = useReassignCategorySheetState.getState().setIsLoading;
  const setErrorMessage = useReassignCategorySheetState.getState().setErrorMessage;

  const handleClose = () => {
    useReassignCategorySheetState.getState().reset();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!selectedId) return;
    setErrorMessage(undefined);
    setIsLoading(true);
    try {
      await onConfirm(selectedId);
      setSelectedId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : Strings.categoriesReassignError);
    } finally {
      setIsLoading(false);
    }
  };

  const footer = (
    <Button
      testID="reassign-cta"
      variant="primary"
      label={Strings.categoriesReassignConfirm}
      isLoading={isLoading}
      isDisabled={!selectedId || isLoading}
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
      <Typography className="font-inter text-muted mb-1 px-4 text-base">
        {Strings.categoriesReassignSubtitle(linkedCount)}
      </Typography>
      <Typography className="font-inter text-muted mb-4 px-4 text-base">
        {Strings.categoriesReassignBody}
      </Typography>
      {errorMessage ? (
        <Typography className="font-inter-medium text-danger mb-2 px-4 text-sm">
          {errorMessage}
        </Typography>
      ) : null}

      <BottomSheetFlatList
        data={options}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <PressableFeedback
            onPress={() => setSelectedId(item.id)}
            style={[styles.optionRow, selectedId === item.id && styles.optionRowActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedId === item.id }}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '22' }]}>
              <MaterialCommunityIcons
                name={toIconName(item.icon, 'tag-outline')}
                size={Size.iconXs}
                color={item.color}
              />
            </View>
            <Typography className="font-inter-medium text-foreground flex-1 text-base">
              {item.name}
            </Typography>
            {selectedId === item.id && (
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
