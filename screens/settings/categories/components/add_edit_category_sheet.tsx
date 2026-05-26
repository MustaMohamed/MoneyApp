import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useEffect } from 'react';
import { type Control, useController } from 'react-hook-form';
import {
  type BlurEvent,
  FlatList,
  type FocusEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod/v4';
import { useShallow } from 'zustand/react/shallow';

import {
  Sheet,
  SHEET_FOOTER_CLEARANCE,
  useBottomSheetAwareHandlers,
} from '@/components/ui/bottom_sheet';
import { Button } from '@/components/ui/button';
import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors, Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { useCategoryStore } from '@/store/category.store';
import type { Category, NewCategoryInput, UpdateCategoryInput } from '@/store/category.store';
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
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));
  const isEditing = editingCategory !== null;

  const {
    state: sheetState,
    setType,
    setSelectedIcon,
    setSelectedColor,
    setIconError,
    setIsLoading,
    initialize,
  } = useAddEditCategorySheetState(
    useShallow((s) => ({
      state: s.state,
      setType: s.setType,
      setSelectedIcon: s.setSelectedIcon,
      setSelectedColor: s.setSelectedColor,
      setIconError: s.setIconError,
      setIsLoading: s.setIsLoading,
      initialize: s.initialize,
    })),
  );

  const schema = createCategorySchema(categoryState.categories, activeTab, editingCategory);
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
    if (!sheetState.selectedIcon) {
      setIconError(Strings.categoriesErrIconRequired);
      return;
    }
    setIsLoading(true);
    try {
      await onSave({
        name,
        type: sheetState.type,
        icon: sheetState.selectedIcon,
        color: sheetState.selectedColor,
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
      isLoading={sheetState.isLoading}
      isDisabled={sheetState.isLoading}
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
        <Text style={styles.fieldLabel}>{Strings.categoriesNameLabel.toUpperCase()}</Text>
        <NameField
          control={control}
          placeholder={Strings.categoriesNamePlaceholder}
          error={errors.name?.message}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
        />

        {!isEditing && (
          <>
            <Text style={styles.fieldLabel}>{Strings.categoriesTypeLabel}</Text>
            <View style={styles.typeRow}>
              {([CategoryType.Expense, CategoryType.Income] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.typePill, sheetState.type === t && styles.typePillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sheetState.type === t }}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      sheetState.type === t && styles.typePillTextActive,
                    ]}
                  >
                    {t === CategoryType.Expense
                      ? Strings.categoriesTabExpense
                      : Strings.categoriesTabIncome}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.fieldLabel}>{Strings.categoriesIconLabel}</Text>
        {sheetState.iconError ? (
          <Text testID="icon-error" style={styles.error}>
            {sheetState.iconError}
          </Text>
        ) : null}
        <FlatList
          data={CATEGORY_ICONS}
          numColumns={8}
          scrollEnabled={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setSelectedIcon(item);
                setIconError('');
              }}
              style={[styles.iconCell, sheetState.selectedIcon === item && styles.iconCellActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: sheetState.selectedIcon === item }}
              accessibilityLabel={item}
            >
              <MaterialCommunityIcons
                name={item}
                size={20}
                color={
                  sheetState.selectedIcon === item ? Colors.shared.cairoGold : Colors.dark.text2
                }
              />
            </Pressable>
          )}
          style={styles.iconGrid}
        />

        <Text style={styles.fieldLabel}>{Strings.categoriesColorLabel}</Text>
        <View style={styles.colorRow}>
          {AccountColors.map((c) => (
            <Pressable
              key={c}
              onPress={() => setSelectedColor(c)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                sheetState.selectedColor === c && styles.colorSwatchActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: sheetState.selectedColor === c }}
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
    <>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={placeholder}
        placeholderTextColor={Colors.dark.text2}
        value={field.value}
        onChangeText={field.onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        maxLength={50}
        accessibilityLabel={placeholder}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: SHEET_FOOTER_CLEARANCE },
  fieldLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    height: ms(48),
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  inputError: { borderColor: Colors.dark.negative },
  error: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.negative,
    marginTop: 4,
  },
  typeRow: { flexDirection: 'row', gap: Spacing.xs },
  typePill: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceEl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  typePillActive: {
    backgroundColor: Colors.shared.cairoGold,
    borderColor: Colors.shared.cairoGold,
  },
  typePillText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  typePillTextActive: { color: Colors.shared.midnightBlue },
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
