# M2e Part 3 — UI Primitives & Sub-pickers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-02-m2e-advanced-filter-drawer-design.md` § 6

**Goal:** Build all the standalone visual components used by the drawer — the trailing filter button on the search row, the reusable section row, the inline date and amount sections, and three multi-select sub-sheets (account, category, custom date). Each component is a pure presentation primitive driven by props from the hook (Part 4).

**Tech Stack:** React Native, TypeScript strict, MaterialCommunityIcons, react-native-reanimated, Cairo Nights tokens.

**Prerequisites:** Part 1 complete (types, store, strings).

**Note on testing:** UI components are not unit-tested per the project convention (testing layer covers helpers + stores + DB only). Verification happens manually in Part 5.

---

## File Structure (this part)

| File | Purpose | Created/Modified |
|---|---|---|
| `app/(app)/(tabs)/transactions/components/filter_button.tsx` | Trailing icon button + count badge | Created |
| `app/(app)/(tabs)/transactions/filter/components/filter_section_row.tsx` | Label + summary + chevron row | Created |
| `app/(app)/(tabs)/transactions/filter/components/filter_amount_section.tsx` | EGP/USD toggle + min/max inputs | Created |
| `app/(app)/(tabs)/transactions/filter/components/filter_date_section.tsx` | Inline radio list of presets + Custom row | Created |
| `app/(app)/(tabs)/transactions/filter/components/filter_account_picker.tsx` | Multi-select bottom sheet for accounts | Created |
| `app/(app)/(tabs)/transactions/filter/components/filter_category_picker.tsx` | Multi-select bottom sheet for categories | Created |
| `app/(app)/(tabs)/transactions/filter/components/filter_date_custom_picker.tsx` | Sub-sheet with from/to date pickers (deferred to Part 4 — needs the picker dep) | Created in Part 4 |

---

## Task 9: `FilterButton` (trailing search-row entry point)

**Files:**
- Create: `app/(app)/(tabs)/transactions/components/filter_button.tsx`

- [ ] **Step 1: Create the file**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';

interface Props {
  count: number;
  onPress: () => void;
}

export function FilterButton({ count, onPress }: Props) {
  const active = count > 0;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <MaterialCommunityIcons
        name="tune-variant"
        size={ms(22)}
        color={active ? Colors.shared.cairoGold : Colors.dark.text2}
      />
      {active && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: ms(40),
    height: ms(40),
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: -ms(4),
    right: -ms(4),
    minWidth: ms(16),
    height: ms(16),
    paddingHorizontal: ms(4),
    borderRadius: ms(8),
    backgroundColor: Colors.shared.cairoGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FontFamily.soraBold,
    fontSize: msFont(10),
    color: Colors.shared.midnightBlue,
    lineHeight: msFont(12),
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/components/filter_button.tsx
git commit -m "feat(m2e): add FilterButton with active count badge"
```

---

## Task 10: `FilterSectionRow` (reusable label + summary row)

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/components/filter_section_row.tsx`

- [ ] **Step 1: Create the file**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface Props {
  label: string;
  summary: string;
  isActive: boolean;
  onPress: () => void;
}

export function FilterSectionRow({ label, summary, isActive, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.right}>
        <Text style={[styles.summary, isActive && styles.summaryActive]} numberOfLines={1}>
          {summary}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={ms(20)} color={Colors.dark.text2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  label: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  summary: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    flexShrink: 1,
  },
  summaryActive: {
    color: Colors.shared.cairoGold,
    fontFamily: FontFamily.interSemi,
  },
});
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/components/filter_section_row.tsx
git commit -m "feat(m2e): add FilterSectionRow primitive"
```

---

## Task 11: `FilterAmountSection` (inline EGP/USD toggle + min/max inputs)

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/components/filter_amount_section.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { parseAmountInput } from '../filter.helpers';

interface Props {
  currency: Currency;
  min: number | undefined;
  max: number | undefined;
  onChangeCurrency: (c: Currency) => void;
  onChangeMin: (v: number | undefined) => void;
  onChangeMax: (v: number | undefined) => void;
}

function formatAmount(n: number | undefined): string {
  if (n === undefined) return '';
  return new Intl.NumberFormat('en-US', { style: 'decimal' }).format(n);
}

export function FilterAmountSection({
  currency,
  min,
  max,
  onChangeCurrency,
  onChangeMin,
  onChangeMax,
}: Props) {
  // Local string state lets the user type freely (commas, decimals) before committing.
  const [minStr, setMinStr] = useState<string>(formatAmount(min));
  const [maxStr, setMaxStr] = useState<string>(formatAmount(max));

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{Strings.filterSectionAmount}</Text>

      <View style={styles.toggleRow}>
        <CurrencyPill
          label={Currency.EGP}
          isActive={currency === Currency.EGP}
          onPress={() => onChangeCurrency(Currency.EGP)}
        />
        <CurrencyPill
          label={Currency.USD}
          isActive={currency === Currency.USD}
          onPress={() => onChangeCurrency(Currency.USD)}
        />
      </View>

      <View style={styles.inputsRow}>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>{Strings.filterCustomFromLabel}</Text>
          <TextInput
            value={minStr}
            onChangeText={setMinStr}
            onBlur={() => {
              const parsed = parseAmountInput(minStr);
              setMinStr(formatAmount(parsed));
              onChangeMin(parsed);
            }}
            placeholder={Strings.filterAmountFromPlaceholder}
            placeholderTextColor={Colors.dark.text2}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>{Strings.filterCustomToLabel}</Text>
          <TextInput
            value={maxStr}
            onChangeText={setMaxStr}
            onBlur={() => {
              const parsed = parseAmountInput(maxStr);
              setMaxStr(formatAmount(parsed));
              onChangeMax(parsed);
            }}
            placeholder={Strings.filterAmountToPlaceholder}
            placeholderTextColor={Colors.dark.text2}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
      </View>
    </View>
  );
}

function CurrencyPill({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        isActive && styles.pillActive,
        pressed && styles.pillPressed,
      ]}
    >
      <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  sectionLabel: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingHorizontal: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: ms(6),
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  pillActive: {
    backgroundColor: Colors.shared.cairoGold,
    borderColor: Colors.shared.cairoGold,
  },
  pillPressed: { opacity: 0.7 },
  pillLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  pillLabelActive: {
    color: Colors.shared.midnightBlue,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  inputLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  input: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
  },
});
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/components/filter_amount_section.tsx
git commit -m "feat(m2e): add FilterAmountSection (currency toggle + min/max inputs)"
```

---

## Task 12: `FilterDateSection` (inline preset radio list)

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/components/filter_date_section.tsx`

- [ ] **Step 1: Create the file**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DatePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface Props {
  preset: DatePreset;
  customFrom: string | undefined;
  customTo: string | undefined;
  onSelectPreset: (p: DatePreset) => void;
  onOpenCustomPicker: () => void;
}

const PRESETS: { value: DatePreset; labelKey: keyof typeof Strings }[] = [
  { value: DatePreset.Today,      labelKey: 'datePresetToday' },
  { value: DatePreset.ThisWeek,   labelKey: 'datePresetThisWeek' },
  { value: DatePreset.ThisMonth,  labelKey: 'datePresetThisMonth' },
  { value: DatePreset.LastMonth,  labelKey: 'datePresetLastMonth' },
  { value: DatePreset.Last30Days, labelKey: 'datePresetLast30Days' },
  { value: DatePreset.ThisYear,   labelKey: 'datePresetThisYear' },
  { value: DatePreset.AllTime,    labelKey: 'datePresetAllTime' },
];

function formatRange(from: string | undefined, to: string | undefined): string {
  if (!from || !to) return '';
  // Display as "May 1, 2026 – May 31, 2026"
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

export function FilterDateSection({
  preset,
  customFrom,
  customTo,
  onSelectPreset,
  onOpenCustomPicker,
}: Props) {
  const isCustom = preset === DatePreset.Custom;
  const customCaption = isCustom ? formatRange(customFrom, customTo) : '';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{Strings.filterSectionDate}</Text>
      <View style={styles.list}>
        {PRESETS.map((p) => (
          <PresetRow
            key={p.value}
            label={Strings[p.labelKey] as string}
            isActive={preset === p.value}
            onPress={() => onSelectPreset(p.value)}
          />
        ))}
        <Pressable
          onPress={onOpenCustomPicker}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.radioWrap}>
            <View style={[styles.radio, isCustom && styles.radioActive]}>
              {isCustom && <View style={styles.radioDot} />}
            </View>
            <Text style={[styles.label, isCustom && styles.labelActive]}>
              {Strings.datePresetCustom}
            </Text>
          </View>
          {customCaption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {customCaption}
            </Text>
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={ms(18)} color={Colors.dark.text2} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function PresetRow({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.radioWrap}>
        <View style={[styles.radio, isActive && styles.radioActive]}>
          {isActive && <View style={styles.radioDot} />}
        </View>
        <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  sectionLabel: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingHorizontal: Spacing.md,
  },
  list: {
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  radioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  radio: {
    width: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    borderWidth: 1.5,
    borderColor: Colors.dark.text2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.shared.cairoGold,
  },
  radioDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: Colors.shared.cairoGold,
  },
  label: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  labelActive: {
    fontFamily: FontFamily.interSemi,
    color: Colors.dark.text1,
  },
  caption: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    flexShrink: 1,
  },
});
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/components/filter_date_section.tsx
git commit -m "feat(m2e): add FilterDateSection (preset radio list + Custom row)"
```

---

## Task 13: `FilterAccountPicker` (multi-select sub-sheet)

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/components/filter_account_picker.tsx`

- [ ] **Step 1: Create the file**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { Account } from '@/database/entities/account.entity';

interface Props {
  visible: boolean;
  accounts: Account[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

function formatBalance(balance: number, currency: string): string {
  return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(balance)} ${currency}`;
}

export function FilterAccountPicker({
  visible,
  accounts,
  selectedIds,
  onToggle,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{Strings.filterPickAccountsTitle}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.doneLabel}>{Strings.filterPickerDone}</Text>
          </Pressable>
        </View>
        <FlatList
          data={accounts}
          keyExtractor={(a) => a.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => {
            const checked = selectedIds.includes(item.id);
            return (
              <Pressable
                onPress={() => onToggle(item.id)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={[styles.dot, { backgroundColor: item.color ?? Colors.dark.surfaceEl }]} />
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.balance}>
                    {formatBalance(item.current_balance, item.currency)}
                  </Text>
                </View>
                <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                  {checked && (
                    <MaterialCommunityIcons name="check" size={ms(14)} color={Colors.shared.midnightBlue} />
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  handle: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  doneLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.shared.cairoGold,
  },
  sep: { height: 1, backgroundColor: Colors.dark.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  dot: { width: ms(12), height: ms(12), borderRadius: ms(6) },
  info: { flex: 1 },
  name: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  balance: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
  },
  checkbox: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(4),
    borderWidth: 1.5,
    borderColor: Colors.dark.text2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.shared.cairoGold,
    borderColor: Colors.shared.cairoGold,
  },
});
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/components/filter_account_picker.tsx
git commit -m "feat(m2e): add FilterAccountPicker multi-select sub-sheet"
```

---

## Task 14: `FilterCategoryPicker` (multi-select sub-sheet)

**Files:**
- Create: `app/(app)/(tabs)/transactions/filter/components/filter_category_picker.tsx`

- [ ] **Step 1: Create the file**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import type { Category } from '@/database/entities/category.entity';

interface Props {
  visible: boolean;
  categories: Category[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function FilterCategoryPicker({
  visible,
  categories,
  selectedIds,
  onToggle,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{Strings.filterPickCategoriesTitle}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.doneLabel}>{Strings.filterPickerDone}</Text>
          </Pressable>
        </View>
        <FlatList
          data={categories}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => {
            const checked = selectedIds.includes(item.id);
            const typeLabel =
              item.type === CategoryType.Income
                ? Strings.filterCategoryTypeIncome
                : Strings.filterCategoryTypeExpense;
            return (
              <Pressable
                onPress={() => onToggle(item.id)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '33' }]}>
                  <MaterialCommunityIcons
                    name={item.icon as MCIName}
                    size={ms(18)}
                    color={item.color}
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.caption}>{typeLabel}</Text>
                </View>
                <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                  {checked && (
                    <MaterialCommunityIcons name="check" size={ms(14)} color={Colors.shared.midnightBlue} />
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '70%',
  },
  handle: {
    width: ms(36),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  doneLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.shared.cairoGold,
  },
  sep: { height: 1, backgroundColor: Colors.dark.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  iconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  caption: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  checkbox: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(4),
    borderWidth: 1.5,
    borderColor: Colors.dark.text2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Colors.shared.cairoGold,
    borderColor: Colors.shared.cairoGold,
  },
});
```

- [ ] **Step 2: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add app/\(app\)/\(tabs\)/transactions/filter/components/filter_category_picker.tsx
git commit -m "feat(m2e): add FilterCategoryPicker multi-select sub-sheet"
```

---

## Part 3 — Definition of Done

- ✅ `FilterButton` component renders with optional badge based on `count` prop.
- ✅ `FilterSectionRow` renders label + summary + chevron, with active-state styling.
- ✅ `FilterAmountSection` renders the EGP/USD pill toggle and two number inputs; commits parsed values on blur.
- ✅ `FilterDateSection` renders 7 preset radio rows + Custom row with caption when a custom range is set.
- ✅ `FilterAccountPicker` and `FilterCategoryPicker` render multi-select bottom sheets with checkbox rows; tap toggles selection.
- ✅ Each component uses Cairo Nights tokens (`Colors`, `FontFamily`, `Spacing`, `Radius`, `Type`, `ms`, `msFont`).
- ✅ `npm run typecheck` clean.
- ✅ Each component committed independently.

The custom date sub-sheet (`filter_date_custom_picker.tsx`) is intentionally deferred to Part 4 because it depends on the date picker dependency added there.

Proceed to `04-drawer-assembly.md`.
