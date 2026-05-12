import { FlashList } from '@shopify/flash-list';
import { Pressable, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { EmptyState } from '@/components/ui/empty_state';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/store/category.store';
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
  const listData = buildListEntries(state.defaultCategories, state.customCategories);

  return (
    <Screen edges={['bottom']}>
      {/* Tab switcher */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: Spacing.sm,
          marginTop: Spacing.sm,
          backgroundColor: Colors.dark.surfaceEl,
          borderRadius: Radius.md,
          padding: 3,
          gap: 3,
        }}
      >
        {(['expense', 'income'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              {
                flex: 1,
                paddingVertical: Spacing.xs,
                borderRadius: Radius.sm,
                alignItems: 'center',
              },
              state.activeTab === tab && { backgroundColor: Colors.shared.cairoGold },
            ]}
          >
            <Text
              className={
                state.activeTab === tab
                  ? 'text-accent-foreground font-sora-semi text-base'
                  : 'text-muted font-inter-medium text-base'
              }
            >
              {tab === 'expense' ? Strings.categoriesTabExpense : Strings.categoriesTabIncome}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List or EmptyState — flex:1 via style (not className) per CLAUDE.md Android Fabric rule */}
      <View style={{ flex: 1 }}>
        {isEmpty ? (
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
            getItemType={(item) => item.type}
            renderItem={({ item }) =>
              item.type === 'header' ? (
                <Text className="text-muted text-xs font-inter-medium tracking-wider mb-1">
                  {item.label}
                </Text>
              ) : (
                <CategoryRow
                  category={item.category}
                  onEdit={() => openEditSheet(item.category)}
                  onDelete={() => handleDeletePress(item.category)}
                  isDeleteDisabled={state.isDeleting}
                />
              )
            }
          />
        )}
      </View>

      {/* Bottom CTA or limit message */}
      <View className="border-t border-separator pt-2 px-4 pb-6">
        {!state.isAtLimit ? (
          <Button
            label={Strings.categoriesAddBtn}
            variant="primary"
            onPress={openAddSheet}
          />
        ) : (
          <Text className="text-muted text-xs font-inter-regular text-center py-3">
            {Strings.categoriesLimitMsg}
          </Text>
        )}
      </View>

      {/* Sheets and dialogs */}
      <AddEditCategorySheet
        visible={state.showAddSheet}
        editingCategory={state.editingCategory}
        activeTab={state.activeTab}
        onClose={closeSheet}
        onSave={handleSave}
      />

      <DeleteConfirmationDialog
        visible={state.showDeleteConfirm}
        categoryName={state.categoryToDelete?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteFlow}
      />

      <ReassignCategorySheet
        visible={state.showReassignSheet}
        categoryName={state.categoryToDelete?.name ?? ''}
        linkedCount={state.linkedCount}
        options={state.reassignOptions}
        onConfirm={handleReassignConfirm}
        onCancel={closeDeleteFlow}
      />
    </Screen>
  );
}
