import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { useFilterDrawer } from './filter.hook';
import { FilterAccountPicker } from './components/filter_account_picker';
import { FilterAmountSection } from './components/filter_amount_section';
import { FilterCategoryPicker } from './components/filter_category_picker';
import { FilterDateCustomPicker } from './components/filter_date_custom_picker';
import { FilterDateSection } from './components/filter_date_section';
import { FilterSectionRow } from './components/filter_section_row';

const WINDOW_HEIGHT = Dimensions.get('window').height;

export function FilterDrawer() {
  const f = useFilterDrawer();
  const sheetRef = useRef<ActionSheetRef>(null);

  useEffect(() => {
    if (f.state.visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [f.state.visible]);

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={f.close}
      gestureEnabled
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <View style={styles.header}>
        <Pressable onPress={() => sheetRef.current?.hide()} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={Size.iconMd} color={Colors.dark.text2} />
        </Pressable>
        <Text style={styles.title}>{Strings.filterTitle}</Text>
        <Pressable onPress={f.resetDraft} hitSlop={8}>
          <Text style={styles.resetLabel}>{Strings.filterReset}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(250)} style={styles.rowWrap}>
          <FilterSectionRow
            label={Strings.filterSectionAccounts}
            summary={f.state.selectedAccountSummary}
            isActive={f.state.draft.accountIds.length > 0}
            onPress={() => f.setAccountPickerVisible(true)}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(250)} style={styles.rowWrap}>
          <FilterSectionRow
            label={Strings.filterSectionCategories}
            summary={f.state.selectedCategorySummary}
            isActive={f.state.draft.categoryIds.length > 0}
            onPress={() => f.setCategoryPickerVisible(true)}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(250)}>
          <FilterDateSection
            preset={f.state.draft.datePreset}
            customFrom={f.state.draft.customDateFrom}
            customTo={f.state.draft.customDateTo}
            onSelectPreset={f.setDatePreset}
            onOpenCustomPicker={() => f.setCustomDatePickerVisible(true)}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(250)}>
          <FilterAmountSection
            currency={f.state.draft.amountCurrency}
            min={f.state.draft.amountMin}
            max={f.state.draft.amountMax}
            onChangeCurrency={f.setAmountCurrency}
            onChangeMin={f.setAmountMin}
            onChangeMax={f.setAmountMax}
          />
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={f.applyDraft}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaLabel}>
            {f.state.draftActiveCount > 0
              ? Strings.filterApplyWithCount(f.state.draftActiveCount)
              : Strings.filterApply}
          </Text>
        </Pressable>
      </View>

      <FilterAccountPicker
        visible={f.state.accountPickerVisible}
        accounts={f.state.pickerAccounts}
        selectedIds={f.state.draft.accountIds}
        onToggle={f.toggleAccountId}
        onClose={() => f.setAccountPickerVisible(false)}
      />

      <FilterCategoryPicker
        visible={f.state.categoryPickerVisible}
        categories={f.state.pickerCategories}
        selectedIds={f.state.draft.categoryIds}
        onToggle={f.toggleCategoryId}
        onClose={() => f.setCategoryPickerVisible(false)}
      />

      <FilterDateCustomPicker
        visible={f.state.customDatePickerVisible}
        initialFrom={f.state.draft.customDateFrom}
        initialTo={f.state.draft.customDateTo}
        onClose={() => f.setCustomDatePickerVisible(false)}
        onConfirm={(from, to) => {
          f.setCustomDateRange(from, to);
          f.setCustomDatePickerVisible(false);
        }}
      />
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: WINDOW_HEIGHT * 0.85,
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: { backgroundColor: Colors.dark.border, width: ms(36), height: ms(4) },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  resetLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.shared.cairoGold,
  },
  scroll: { flexGrow: 1, flexShrink: 1 },
  scrollContent: { gap: Spacing.md, paddingBottom: Spacing.xl, paddingTop: Spacing.xs },
  rowWrap: { paddingHorizontal: Spacing.md },
  footer: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.surface,
  },
  cta: {
    height: Size.ctaHeight,
    backgroundColor: Colors.shared.cairoGold,
    borderRadius: Radius.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.85 },
  ctaLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
