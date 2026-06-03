import { useSignals } from '@preact/signals-react/runtime';
import { FlashList } from '@shopify/flash-list';
import { Spinner } from 'heroui-native';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty_state';
import { Screen } from '@/components/ui/screen';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import type { Category } from '@/modules/categories/store/category.store';

import { useCategories } from './categories.hook';
import { AddEditCategorySheet } from './components/add_edit_category_sheet';
import { CategoryRow } from './components/category_row';
import { DeleteConfirmationDialog } from './components/delete_confirmation_dialog';
import { ReassignCategorySheet } from './components/reassign_category_sheet';

type ListEntry =
  | { type: 'header'; id: string; label: string }
  | { type: 'category'; id: string; category: Category };

function buildListEntries(defaults: Category[], customs: Category[]): ListEntry[] {
  const entries: ListEntry[] = [];
  if (defaults.length > 0) {
    entries.push({ type: 'header', id: 'header-default', label: Strings.categoriesDefaultSection });
    for (const c of defaults) entries.push({ type: 'category', id: c.id, category: c });
  }
  if (customs.length > 0) {
    entries.push({ type: 'header', id: 'header-custom', label: Strings.categoriesCustomSection });
    for (const c of customs) entries.push({ type: 'category', id: c.id, category: c });
  }
  return entries;
}

export default function CategoriesScreen() {
  useSignals();
  const {
    state,
    setActiveTab,
    openAddSheet,
    openEditSheet,
    closeSheet,
    handleSave,
    handleDeletePress,
    handleDeleteConfirm,
    handleReassignConfirm,
    closeDeleteFlow,
  } = useCategories();

  const isEmpty = state.defaultCategories.length === 0 && state.customCategories.length === 0;
  const activeTab = state.activeTab.value;
  const showAddSheet = state.showAddSheet.value;
  const editingCategory = state.editingCategory.value;
  const categoryToDelete = state.categoryToDelete.value;
  const showDeleteConfirm = state.showDeleteConfirm.value;
  const showReassignSheet = state.showReassignSheet.value;
  const linkedCount = state.linkedCount.value;
  const isDeleting = state.isDeleting.value;
  const listData = useMemo(
    () => buildListEntries(state.defaultCategories, state.customCategories),
    [state.customCategories, state.defaultCategories],
  );

  const getItemType = useCallback((item: ListEntry) => item.type, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ListEntry; index: number }) =>
      item.type === 'header' ? (
        <Text className="text-muted font-inter-medium mb-1 text-xs tracking-wider">
          {item.label}
        </Text>
      ) : (
        <CategoryRow
          category={item.category}
          onEdit={openEditSheet}
          onDelete={handleDeletePress}
          isDeleteDisabled={isDeleting}
          isLast={index === listData.length - 1 || listData[index + 1]?.type === 'header'}
        />
      ),
    [handleDeletePress, isDeleting, listData, openEditSheet],
  );

  return (
    <Screen edges={['bottom']}>
      {/* Tab switcher */}
      <View style={{ marginHorizontal: Spacing.sm, marginVertical: Spacing.sm }}>
        <SegmentedTabs<CategoryType>
          segments={[
            { value: CategoryType.Expense, label: Strings.categoriesTabExpense },
            { value: CategoryType.Income, label: Strings.categoriesTabIncome },
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
          variant="solid-gold"
          listClassName="w-full"
          accessibilityLabel="Category type"
        />
      </View>

      {/* List or EmptyState — flex:1 via style (not className) per CLAUDE.md Android Fabric rule */}
      <View style={{ flex: 1 }}>
        {!state.hasLoaded ? (
          <View className="items-center justify-center py-12">
            <Spinner />
          </View>
        ) : isEmpty ? (
          <EmptyState variant="categories" />
        ) : (
          <FlashList<ListEntry>
            data={listData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: Spacing.sm,
              paddingTop: Spacing.md,
              paddingBottom: Spacing.xxl,
            }}
            getItemType={getItemType}
            renderItem={renderItem}
          />
        )}
      </View>

      {/* Bottom CTA or limit message */}
      <View className="border-separator border-t px-4 pt-2 pb-6">
        {!state.isAtLimit ? (
          <Button label={Strings.categoriesAddBtn} variant="primary" onPress={openAddSheet} />
        ) : (
          <Text className="text-muted font-inter-regular py-3 text-center text-xs">
            {Strings.categoriesLimitMsg}
          </Text>
        )}
      </View>

      {/* Sheets and dialogs */}
      <AddEditCategorySheet
        isOpen={showAddSheet}
        editingCategory={editingCategory}
        activeTab={activeTab}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onSave={handleSave}
      />

      <DeleteConfirmationDialog
        visible={showDeleteConfirm}
        categoryName={categoryToDelete?.name ?? ''}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        onCancel={closeDeleteFlow}
      />

      <ReassignCategorySheet
        isOpen={showReassignSheet}
        categoryName={categoryToDelete?.name ?? ''}
        linkedCount={linkedCount}
        options={state.reassignOptions}
        onConfirm={handleReassignConfirm}
        onOpenChange={(open) => {
          if (!open) closeDeleteFlow();
        }}
      />
    </Screen>
  );
}
