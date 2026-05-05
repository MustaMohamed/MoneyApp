import { useEffect } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type Control, useController } from 'react-hook-form';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod/v4';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors, Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { useCategoryStore } from '@/store/category.store';
import type { Category, NewCategoryInput, UpdateCategoryInput } from '@/store/category.store';
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

function createCategorySchema(categories: Category[], editingId?: string) {
  return z.object({
    name: z
      .string()
      .min(1, Strings.categoriesErrNameRequired)
      .max(20, Strings.categoriesErrNameTooLong)
      .refine(
        (val) =>
          !categories.some((c) => c.name.toLowerCase() === val.toLowerCase() && c.id !== editingId),
        Strings.categoriesErrNameDuplicate,
      ),
  });
}

interface AddEditCategorySheetProps {
  visible: boolean;
  editingCategory: Category | null;
  activeTab: 'expense' | 'income';
  onClose: () => void;
  onSave: (data: NewCategoryInput | UpdateCategoryInput) => Promise<void>;
}

export function AddEditCategorySheet({
  visible,
  editingCategory,
  activeTab,
  onClose,
  onSave,
}: AddEditCategorySheetProps) {
  const categories = useCategoryStore((s) => s.state.categories);
  const isEditing = editingCategory !== null;

  const type = useAddEditCategorySheetState((s) => s.state.type);
  const selectedIcon = useAddEditCategorySheetState((s) => s.state.selectedIcon);
  const selectedColor = useAddEditCategorySheetState((s) => s.state.selectedColor);
  const iconError = useAddEditCategorySheetState((s) => s.state.iconError);
  const isLoading = useAddEditCategorySheetState((s) => s.state.isLoading);
  const setType = useAddEditCategorySheetState((s) => s.setType);
  const setSelectedIcon = useAddEditCategorySheetState((s) => s.setSelectedIcon);
  const setSelectedColor = useAddEditCategorySheetState((s) => s.setSelectedColor);
  const setIconError = useAddEditCategorySheetState((s) => s.setIconError);
  const setIsLoading = useAddEditCategorySheetState((s) => s.setIsLoading);
  const initialize = useAddEditCategorySheetState((s) => s.initialize);

  const schema = createCategorySchema(categories, editingCategory?.id);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm(schema, {
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (visible) {
      if (editingCategory) {
        reset({ name: editingCategory.name });
        initialize({
          type: editingCategory.type,
          icon: editingCategory.icon as IconName,
          color: editingCategory.color,
        });
      } else {
        reset({ name: '' });
        initialize({
          type: activeTab as CategoryType,
          icon: null,
          color: AccountColors[0],
        });
      }
    }
  }, [visible, editingCategory, activeTab]);

  const handleSave = handleSubmit(async ({ name }) => {
    if (!selectedIcon) {
      setIconError(Strings.categoriesErrIconRequired);
      return;
    }
    setIsLoading(true);
    try {
      await onSave({ name, type, icon: selectedIcon, color: selectedColor });
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            {isEditing ? Strings.categoriesEditSheetTitle : Strings.categoriesAddSheetTitle}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Name */}
            <Text style={styles.fieldLabel}>{Strings.categoriesNameLabel.toUpperCase()}</Text>
            <NameField
              control={control}
              placeholder={Strings.categoriesNamePlaceholder}
              error={errors.name?.message}
            />

            {/* Type toggle — locked when editing */}
            {!isEditing && (
              <>
                <Text style={styles.fieldLabel}>{Strings.categoriesTypeLabel}</Text>
                <View style={styles.typeRow}>
                  {(['expense', 'income'] as const).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setType(t as CategoryType)}
                      style={[styles.typePill, type === t && styles.typePillActive]}
                    >
                      <Text style={[styles.typePillText, type === t && styles.typePillTextActive]}>
                        {t === 'expense'
                          ? Strings.categoriesTabExpense
                          : Strings.categoriesTabIncome}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Icon picker */}
            <Text style={styles.fieldLabel}>{Strings.categoriesIconLabel}</Text>
            {iconError ? <Text style={styles.error}>{iconError}</Text> : null}
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
                  style={[styles.iconCell, selectedIcon === item && styles.iconCellActive]}
                >
                  <MaterialCommunityIcons
                    name={item}
                    size={20}
                    color={selectedIcon === item ? Colors.shared.cairoGold : Colors.dark.text2}
                  />
                </Pressable>
              )}
              style={styles.iconGrid}
            />

            {/* Color picker */}
            <Text style={styles.fieldLabel}>{Strings.categoriesColorLabel}</Text>
            <View style={styles.colorRow}>
              {AccountColors.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorSwatchActive,
                  ]}
                />
              ))}
            </View>
          </ScrollView>

          {/* Save CTA */}
          <View style={styles.ctaWrap}>
            <Pressable onPress={handleSave} style={styles.cta} disabled={isLoading}>
              <Text style={styles.ctaText}>{Strings.categoriesSaveCta}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NameField({
  control,
  placeholder,
  error,
}: {
  control: Control<{ name: string }>;
  placeholder: string;
  error?: string;
}) {
  const { field } = useController({ control, name: 'name' });
  return (
    <>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={placeholder}
        placeholderTextColor={Colors.dark.text2}
        value={field.value as string}
        onChangeText={field.onChange}
        maxLength={20}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    height: 48,
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
    margin: 3,
    backgroundColor: Colors.dark.surfaceEl,
  },
  iconCellActive: { borderWidth: 2, borderColor: Colors.shared.cairoGold },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  colorSwatch: { width: 28, height: 28, borderRadius: 14 },
  colorSwatchActive: { borderWidth: 2, borderColor: Colors.dark.text1 },
  ctaWrap: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    marginTop: Spacing.sm,
  },
  cta: {
    height: Size.ctaHeight,
    borderRadius: Radius.cta,
    backgroundColor: Colors.shared.cairoGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
