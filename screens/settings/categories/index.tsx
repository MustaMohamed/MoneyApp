import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FlashList } from '@shopify/flash-list';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
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
    goBack,
  } = useCategories();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={Size.iconBack}
            color={Colors.dark.text2}
          />
        </Pressable>
        <Text style={styles.title}>{Strings.categoriesTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(['expense', 'income'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, state.activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, state.activeTab === tab && styles.tabTextActive]}>
              {tab === 'expense' ? Strings.categoriesTabExpense : Strings.categoriesTabIncome}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlashList<ListEntry>
        data={buildListEntries(state.defaultCategories, state.customCategories)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        getItemType={(item) => item.type}
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <Text
              style={[
                styles.sectionLabel,
                item.id === 'header-custom' && styles.sectionLabelCustom,
              ]}
            >
              {item.label}
            </Text>
          ) : (
            <CategoryRow
              category={item.category}
              onEdit={() => openEditSheet(item.category)}
              onDelete={() => handleDeletePress(item.category)}
            />
          )
        }
      />

      {/* FAB */}
      {!state.isAtLimit ? (
        <View style={styles.fabWrap}>
          <Pressable onPress={openAddSheet} style={styles.fab}>
            <MaterialCommunityIcons
              name="plus"
              size={Size.iconSm}
              color={Colors.shared.midnightBlue}
            />
            <Text style={styles.fabText}>{Strings.categoriesAddBtn}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.fabWrap}>
          <Text style={styles.limitMsg}>{Strings.categoriesLimitMsg}</Text>
        </View>
      )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  backBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    borderRadius: Spacing.sm,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  headerSpacer: { width: Size.backBtn, height: Size.backBtn },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.shared.cairoGold,
  },
  tabText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  tabTextActive: {
    color: Colors.shared.midnightBlue,
    fontFamily: FontFamily.soraSemi,
  },
  list: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  sectionLabelCustom: {
    marginTop: Spacing.md,
  },
  fabWrap: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.surface,
  },
  fab: {
    height: Size.ctaHeight,
    borderRadius: Radius.cta,
    backgroundColor: Colors.shared.cairoGold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  fabText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
  limitMsg: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
