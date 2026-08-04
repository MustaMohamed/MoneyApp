import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { PressableFeedback, Typography } from 'heroui-native';
import { useEffect } from 'react';
import { type Control, useController } from 'react-hook-form';
import { type BlurEvent, FlatList, type FocusEvent, StyleSheet, View } from 'react-native';
import { z } from 'zod/v4';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SHEET_FOOTER_CLEARANCE, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { SegmentedTabs } from '@/components/ui/tabs';
import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors, Colors, Radius, Spacing } from '@/constants/theme';
import {
  useCategoryStore,
  type Category,
  type NewCategoryInput,
  type UpdateCategoryInput,
} from '@/modules/categories/store/category.store';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useAddEditCategorySheetState } from './add_edit_category_sheet.state';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const CATEGORY_ICONS: IconName[] = [
  'home',
  'food-fork-drink',
  'cart',
  'silverware-fork-knife',
  'bus',
  'car',
  'lightning-bolt',
  'wifi',
  'pill',
  'cellphone',
  'shopping',
  'hanger',
  'school',
  'account-group',
  'hand-heart',
  'gift-outline',
  'gift',
  'receipt',
  'bank-transfer',
  'bank-transfer-out',
  'bank',
  'party-popper',
  'briefcase',
  'lightbulb',
  'chart-line',
  'arrow-down-circle',
  'dots-horizontal',
  'star',
  'heart',
  'music-note',
  'dumbbell',
  'airplane',
];

export function createCategorySchema(
  categories: Category[],
  activeTab: CategoryType,
  editingCategory?: Category | null,
) {
  const editingId = editingCategory?.id;
  const editingType = editingCategory?.type ?? activeTab;
  return z.object({
    name: z
      .string()
      .min(1, Strings.categoriesErrNameRequired)
      .max(50, Strings.categoriesErrNameTooLong)
      .refine(
        (val) =>
          !categories.some(
            (c) =>
              c.name.toLowerCase() === val.toLowerCase() &&
              c.id !== editingId &&
              c.type === editingType,
          ),
        Strings.categoriesErrNameDuplicate,
      ),
  });
}

interface AddEditCategorySheetProps {
  isOpen: boolean;
  editingCategory: Category | null;
  activeTab: CategoryType;
  onOpenChange: (open: boolean) => void;
  onSave: (data: NewCategoryInput | UpdateCategoryInput) => Promise<void>;
}

export function AddEditCategorySheet({
  isOpen,
  editingCategory,
  activeTab,
  onOpenChange,
  onSave,
}: AddEditCategorySheetProps) {
  const categories = useCategoryStore.useState.categories();
  const isEditing = editingCategory !== null;

  const { type, selectedIcon, selectedColor, iconError, isLoading } = useAddEditCategorySheetState(
    useShallow((s) => ({
      type: s.type,
      selectedIcon: s.selectedIcon,
      selectedColor: s.selectedColor,
      iconError: s.iconError,
      isLoading: s.isLoading,
    })),
  );
  const setType = useAddEditCategorySheetState.getState().setType;
  const setSelectedIcon = useAddEditCategorySheetState.getState().setSelectedIcon;
  const setSelectedColor = useAddEditCategorySheetState.getState().setSelectedColor;
  const setIconError = useAddEditCategorySheetState.getState().setIconError;
  const setIsLoading = useAddEditCategorySheetState.getState().setIsLoading;
  const initialize = useAddEditCategorySheetState.getState().initialize;

  const schema = createCategorySchema(categories, activeTab, editingCategory);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm(schema, {
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        reset({ name: editingCategory.name });
        initialize({
          type: editingCategory.type,
          icon: toIconName(editingCategory.icon, 'tag-outline'),
          color: editingCategory.color,
        });
      } else {
        reset({ name: '' });
        initialize({
          type: activeTab,
          icon: null,
          color: AccountColors[0],
        });
      }
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingCategory, activeTab]); // initialize is a stable Zustand action; reset is stable RHF method

  const handleSave = handleSubmit(async ({ name }) => {
    if (!selectedIcon) {
      setIconError(Strings.categoriesErrIconRequired);
      return;
    }
    setIsLoading(true);
    try {
      await onSave({
        name,
        type,
        icon: selectedIcon,
        color: selectedColor,
      });
    } finally {
      setIsLoading(false);
    }
  });

  const footer = (
    <Button
      testID="add-edit-category-save-btn"
      variant="primary"
      label={Strings.categoriesSaveCta}
      isLoading={isLoading}
      isDisabled={isLoading}
      onPress={() => void handleSave()}
    />
  );

  const { onFocus: onInputFocus, onBlur: onInputBlur } = useBottomSheetAwareHandlers();

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={isEditing ? Strings.categoriesEditSheetTitle : Strings.categoriesAddSheetTitle}
      size="lg"
      scrollable
      footer={footer}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Typography className="font-inter-medium text-muted mt-3 mb-1 text-xs tracking-wider">
          {Strings.categoriesNameLabel.toUpperCase()}
        </Typography>
        <NameField
          control={control}
          placeholder={Strings.categoriesNamePlaceholder}
          error={errors.name?.message}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
        />

        {!isEditing && (
          <>
            <Typography className="font-inter-medium text-muted mt-3 mb-1 text-xs tracking-wider">
              {Strings.categoriesTypeLabel}
            </Typography>
            <SegmentedTabs<CategoryType>
              segments={[
                { value: CategoryType.Expense, label: Strings.categoriesTabExpense },
                { value: CategoryType.Income, label: Strings.categoriesTabIncome },
              ]}
              value={type}
              onValueChange={setType}
              variant="solid-gold"
              listClassName="w-full"
              accessibilityLabel={Strings.categoriesTypeLabel}
            />
          </>
        )}

        <Typography className="font-inter-medium text-muted mt-3 mb-1 text-xs tracking-wider">
          {Strings.categoriesIconLabel}
        </Typography>
        {iconError ? (
          <Typography testID="icon-error" className="font-inter-regular text-danger mt-1 text-xs">
            {iconError}
          </Typography>
        ) : null}
        <FlatList
          data={CATEGORY_ICONS}
          numColumns={8}
          scrollEnabled={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <PressableFeedback
              onPress={() => {
                setSelectedIcon(item);
                setIconError('');
              }}
              style={[styles.iconCell, selectedIcon === item && styles.iconCellActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedIcon === item }}
              accessibilityLabel={item}
            >
              <MaterialCommunityIcons
                name={item}
                size={20}
                color={selectedIcon === item ? Colors.shared.cairoGold : Colors.dark.text2}
              />
            </PressableFeedback>
          )}
          style={styles.iconGrid}
        />

        <Typography className="font-inter-medium text-muted mt-3 mb-1 text-xs tracking-wider">
          {Strings.categoriesColorLabel}
        </Typography>
        <View style={styles.colorRow}>
          {AccountColors.map((c) => (
            <PressableFeedback
              key={c}
              onPress={() => setSelectedColor(c)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                selectedColor === c && styles.colorSwatchActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedColor === c }}
              accessibilityLabel={c}
            />
          ))}
        </View>
      </BottomSheetScrollView>
    </Sheet>
  );
}

function NameField({
  control,
  placeholder,
  error,
  onFocus,
  onBlur,
}: {
  control: Control<{ name: string }>;
  placeholder: string;
  error?: string;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: BlurEvent) => void;
}) {
  const { field } = useController({ control, name: 'name' });
  return (
    <Input
      placeholder={placeholder}
      value={field.value}
      onChangeText={field.onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      maxLength={50}
      accessibilityLabel={placeholder}
      isInvalid={!!error}
      errorMessage={error}
    />
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: SHEET_FOOTER_CLEARANCE },
  iconGrid: { marginBottom: Spacing.xs },
  iconCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    margin: ms(3),
    backgroundColor: Colors.dark.surfaceEl,
  },
  iconCellActive: { borderWidth: 2, borderColor: Colors.shared.cairoGold },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  colorSwatch: { width: ms(28), height: ms(28), borderRadius: ms(14) },
  colorSwatchActive: { borderWidth: 2, borderColor: Colors.dark.text1 },
});
