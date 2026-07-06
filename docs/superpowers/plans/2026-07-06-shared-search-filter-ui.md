# Shared Search and Filter UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract shared presentational search/filter UI used by Transactions and Commitments without changing behavior.

**Architecture:** Add shared leaf UI primitives under `src/components/ui/` and keep domain wrappers in Transactions and Commitments. Hooks, stores, parsing, summaries, and filter logic stay in their existing module files.

**Tech Stack:** React Native, Expo, TypeScript, HeroUI Native `Accordion`/`PressableFeedback`, existing UI wrappers, Jest + React Native Testing Library, Zustand module hooks/stores.

---

## File Map

- Create: `src/components/ui/search_filter_row.tsx`
  - Shared compact search input, clear action, filter button, active badge, and exported stable style constants.
- Create: `src/components/ui/filter_accordion.tsx`
  - Shared accordion shell/header, option-pill list, and amount-range content.
- Modify: `src/modules/transactions/screens/transactions/components/search_row.tsx`
  - Thin wrapper around `SearchFilterRow`; preserves exported style constant names used by existing tests.
- Modify: `src/modules/commitments/screens/commitments/components/search_row.tsx`
  - Thin wrapper around `SearchFilterRow`; preserves exported commitment style constant names used by existing tests.
- Modify: `src/modules/transactions/screens/transactions/filter/components/account_accordion.tsx`
  - Thin wrapper using `FilterAccordionShell` and `FilterOptionPillList`.
- Modify: `src/modules/transactions/screens/transactions/filter/components/category_accordion.tsx`
  - Thin wrapper using `FilterAccordionShell` and `FilterOptionPillList`.
- Modify: `src/modules/transactions/screens/transactions/filter/components/amount_accordion.tsx`
  - Thin wrapper using `FilterAccordionShell` and `AmountRangeFilterContent`.
- Modify: `src/modules/commitments/screens/commitments/filter/components/account_accordion.tsx`
  - Thin wrapper using `FilterAccordionShell` and `FilterOptionPillList`.
- Modify: `src/modules/commitments/screens/commitments/filter/components/category_accordion.tsx`
  - Thin wrapper using `FilterAccordionShell` and `FilterOptionPillList`.
- Modify: `src/modules/commitments/screens/commitments/filter/components/amount_accordion.tsx`
  - Thin wrapper using `FilterAccordionShell` and `AmountRangeFilterContent`.
- Modify: `src/modules/commitments/screens/commitments/filter/components/amount_type_accordion.tsx`
  - Thin wrapper using `FilterAccordionShell` and `FilterOptionPillList`.
- Modify: `src/modules/commitments/screens/commitments/filter/components/recurrence_accordion.tsx`
  - Thin wrapper using `FilterAccordionShell` and `FilterOptionPillList`.
- Add: `__tests__/components/ui/search_filter_row.test.tsx`
  - Shared search row behavior tests.
- Add: `__tests__/components/ui/filter_accordion.test.tsx`
  - Shared accordion shell/list/amount-content behavior tests.
- Modify: `__tests__/screens/transactions/search_row.test.tsx`
  - Verify transaction wrapper passes transaction copy and badge test ID through shared component.
- Modify: `__tests__/screens/commitments/search_row.test.tsx`
  - Verify commitment wrapper passes commitment copy and badge test ID through shared component.
- Modify: `__tests__/screens/filter_component_architecture.test.ts`
  - Extend architecture scan to include shared UI primitives and forbid domain helper/store imports.

---

## Task 1: Shared SearchFilterRow

**Files:**
- Create: `__tests__/components/ui/search_filter_row.test.tsx`
- Create: `src/components/ui/search_filter_row.tsx`
- Modify: `src/modules/transactions/screens/transactions/components/search_row.tsx`
- Modify: `src/modules/commitments/screens/commitments/components/search_row.tsx`
- Modify: `__tests__/screens/transactions/search_row.test.tsx`
- Modify: `__tests__/screens/commitments/search_row.test.tsx`

- [ ] **Step 1: Write the failing shared search row test**

Create `__tests__/components/ui/search_filter_row.test.tsx` with this test coverage:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import {
  FILTER_BADGE_STYLE,
  FILTER_BUTTON_COMPACT_STYLE,
  SEARCH_INPUT_COMPACT_STYLE,
  SEARCH_INPUT_WITH_CLEAR_STYLE,
  SearchFilterRow,
} from '@/components/ui/search_filter_row';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});
jest.mock('@/components/ui/input', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { TextInput } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Input: (props: object) => ReactLocal.createElement(TextInput, props),
  };
});

describe('SearchFilterRow', () => {
  it('renders compact input and trailing filter button', () => {
    const { getByLabelText } = render(
      <SearchFilterRow
        value=""
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
        filterBadgeTestID="shared-filter-badge"
      />,
    );

    expect(SEARCH_INPUT_COMPACT_STYLE).toMatchObject({
      height: FILTER_BUTTON_COMPACT_STYLE.height,
      minHeight: FILTER_BUTTON_COMPACT_STYLE.height,
    });
    expect(getByLabelText('Search items...')).toHaveProp('style', SEARCH_INPUT_COMPACT_STYLE);
    expect(getByLabelText('Filter')).toHaveProp('style', FILTER_BUTTON_COMPACT_STYLE);
  });

  it('shows active badge only when filter count is positive', () => {
    const empty = render(
      <SearchFilterRow
        value=""
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
        filterBadgeTestID="shared-filter-badge"
      />,
    );
    expect(empty.queryByTestId('shared-filter-badge')).toBeNull();

    const active = render(
      <SearchFilterRow
        value=""
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={3}
        filterBadgeTestID="shared-filter-badge"
      />,
    );
    expect(active.getByText('3')).toBeTruthy();
    expect(active.getByTestId('shared-filter-badge')).toHaveProp('style', FILTER_BADGE_STYLE);
    expect(active.getByLabelText('Filter, 3 active')).toBeTruthy();
  });

  it('reserves clear-action space only when text is present', () => {
    const active = render(
      <SearchFilterRow
        value="rent"
        placeholder="Search items..."
        onChangeText={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
        filterBadgeTestID="shared-filter-badge"
      />,
    );

    expect(SEARCH_INPUT_COMPACT_STYLE.paddingRight).toBeLessThan(
      SEARCH_INPUT_WITH_CLEAR_STYLE.paddingRight,
    );
    expect(active.getByLabelText('Search items...')).toHaveProp(
      'style',
      SEARCH_INPUT_WITH_CLEAR_STYLE,
    );
    expect(active.getByLabelText('Clear search')).toBeTruthy();
  });

  it('calls search, clear, and filter callbacks', () => {
    const onChangeText = jest.fn();
    const onClear = jest.fn();
    const onOpenFilter = jest.fn();
    const { getByLabelText } = render(
      <SearchFilterRow
        value="rent"
        placeholder="Search items..."
        onChangeText={onChangeText}
        onClear={onClear}
        onOpenFilter={onOpenFilter}
        activeFilterCount={1}
        filterBadgeTestID="shared-filter-badge"
      />,
    );

    fireEvent.changeText(getByLabelText('Search items...'), 'gym');
    expect(onChangeText).toHaveBeenCalledWith('gym');

    fireEvent.press(getByLabelText('Clear search'));
    expect(onClear).toHaveBeenCalled();

    fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the shared search row test and verify it fails**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/ui/search_filter_row.test.tsx
```

Expected: FAIL with module-not-found for `@/components/ui/search_filter_row`.

- [ ] **Step 3: Implement `SearchFilterRow`**

Create `src/components/ui/search_filter_row.tsx` with this implementation:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { Input } from './input';
import { Text } from './text';

interface SearchFilterRowProps {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
  filterBadgeTestID: string;
  clearAccessibilityLabel?: string;
  filterAccessibilityLabel?: string;
}

const COMPACT_CONTROL_SIZE = ms(36);
const SEARCH_INPUT_HORIZONTAL_PADDING = ms(12);
const SEARCH_INPUT_CLEAR_PADDING = ms(40);
const FILTER_BADGE_SIZE = ms(16);

export const SEARCH_INPUT_COMPACT_STYLE = {
  height: COMPACT_CONTROL_SIZE,
  minHeight: COMPACT_CONTROL_SIZE,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: SEARCH_INPUT_HORIZONTAL_PADDING,
  paddingRight: SEARCH_INPUT_HORIZONTAL_PADDING,
} as const;

export const SEARCH_INPUT_WITH_CLEAR_STYLE = {
  ...SEARCH_INPUT_COMPACT_STYLE,
  paddingRight: SEARCH_INPUT_CLEAR_PADDING,
} as const;

export const FILTER_BUTTON_COMPACT_STYLE = {
  height: COMPACT_CONTROL_SIZE,
  width: COMPACT_CONTROL_SIZE,
  borderRadius: Radius.md,
} as const;

export const FILTER_BADGE_STYLE = {
  top: ms(2),
  right: ms(2),
  minWidth: FILTER_BADGE_SIZE,
  height: FILTER_BADGE_SIZE,
  borderRadius: FILTER_BADGE_SIZE / 2,
} as const;

const FILTER_BADGE_TEXT_STYLE = {
  lineHeight: FILTER_BADGE_SIZE,
} as const;

export function SearchFilterRow({
  value,
  placeholder,
  onChangeText,
  onClear,
  onOpenFilter,
  activeFilterCount,
  filterBadgeTestID,
  clearAccessibilityLabel = 'Clear search',
  filterAccessibilityLabel = 'Filter',
}: SearchFilterRowProps): React.ReactElement {
  const hasValue = value.length > 0;
  const hasFilters = activeFilterCount > 0;
  const filterLabel = `${filterAccessibilityLabel}${hasFilters ? `, ${activeFilterCount} active` : ''}`;

  return (
    <View className="mb-2 flex-row items-center gap-2 px-4">
      <View className="flex-1">
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={placeholder}
          style={hasValue ? SEARCH_INPUT_WITH_CLEAR_STYLE : SEARCH_INPUT_COMPACT_STYLE}
        />
        {hasValue ? (
          <PressableFeedback
            onPress={onClear}
            hitSlop={8}
            accessibilityLabel={clearAccessibilityLabel}
            className="absolute top-1.5 right-2 h-7 w-7 items-center justify-center"
          >
            <MaterialCommunityIcons name="close-circle" size={16} color={Colors.dark.text2} />
          </PressableFeedback>
        ) : null}
      </View>
      <PressableFeedback
        onPress={onOpenFilter}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={filterLabel}
        className="bg-default/40 relative items-center justify-center"
        style={FILTER_BUTTON_COMPACT_STYLE}
      >
        <MaterialCommunityIcons name="tune-variant" size={18} color={Colors.dark.text1} />
        {hasFilters ? (
          <View
            testID={filterBadgeTestID}
            className="bg-accent absolute items-center justify-center px-1"
            style={FILTER_BADGE_STYLE}
          >
            <Text
              className="font-inter text-accent-foreground text-[9px] font-bold"
              style={FILTER_BADGE_TEXT_STYLE}
            >
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </PressableFeedback>
    </View>
  );
}
```

- [ ] **Step 4: Run the shared search row test and verify it passes**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/ui/search_filter_row.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Refactor domain search row wrappers**

Replace the bodies of the transaction and commitment search row files with thin wrappers around `SearchFilterRow`. Preserve existing exported constant names by aliasing the shared constants.

Transaction wrapper:

```tsx
// modules/transactions/screens/transactions/components/search_row.tsx
import React from 'react';

import {
  FILTER_BADGE_STYLE,
  FILTER_BUTTON_COMPACT_STYLE,
  SEARCH_INPUT_COMPACT_STYLE,
  SEARCH_INPUT_WITH_CLEAR_STYLE,
  SearchFilterRow,
} from '@/components/ui/search_filter_row';
import { Strings } from '@/constants/strings';

interface Props {
  value: string;
  onChange: (s: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

export {
  FILTER_BADGE_STYLE,
  FILTER_BUTTON_COMPACT_STYLE,
  SEARCH_INPUT_COMPACT_STYLE,
  SEARCH_INPUT_WITH_CLEAR_STYLE,
};

export function SearchRow({
  value,
  onChange,
  onClear,
  onOpenFilter,
  activeFilterCount,
}: Props): React.ReactElement {
  return (
    <SearchFilterRow
      value={value}
      placeholder={Strings.searchTransactionsPlaceholder}
      onChangeText={onChange}
      onClear={onClear}
      onOpenFilter={onOpenFilter}
      activeFilterCount={activeFilterCount}
      filterBadgeTestID="filter-badge"
    />
  );
}
```

Commitment wrapper:

```tsx
import React from 'react';

import {
  FILTER_BADGE_STYLE as COMMITMENT_FILTER_BADGE_STYLE,
  FILTER_BUTTON_COMPACT_STYLE as COMMITMENT_FILTER_BUTTON_STYLE,
  SEARCH_INPUT_COMPACT_STYLE as COMMITMENT_SEARCH_INPUT_STYLE,
  SEARCH_INPUT_WITH_CLEAR_STYLE as COMMITMENT_SEARCH_INPUT_WITH_CLEAR_STYLE,
  SearchFilterRow,
} from '@/components/ui/search_filter_row';
import { Strings } from '@/constants/strings';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

export {
  COMMITMENT_FILTER_BADGE_STYLE,
  COMMITMENT_FILTER_BUTTON_STYLE,
  COMMITMENT_SEARCH_INPUT_STYLE,
  COMMITMENT_SEARCH_INPUT_WITH_CLEAR_STYLE,
};

export function CommitmentSearchRow({
  value,
  onChange,
  onClear,
  onOpenFilter,
  activeFilterCount,
}: Props): React.ReactElement {
  return (
    <SearchFilterRow
      value={value}
      placeholder={Strings.searchCommitmentsPlaceholder}
      onChangeText={onChange}
      onClear={onClear}
      onOpenFilter={onOpenFilter}
      activeFilterCount={activeFilterCount}
      filterBadgeTestID="commitment-filter-badge"
    />
  );
}
```

- [ ] **Step 6: Run search row wrapper tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/ui/search_filter_row.test.tsx __tests__/screens/transactions/search_row.test.tsx __tests__/screens/commitments/search_row.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

Run:

```bash
git add src/components/ui/search_filter_row.tsx src/modules/transactions/screens/transactions/components/search_row.tsx src/modules/commitments/screens/commitments/components/search_row.tsx __tests__/components/ui/search_filter_row.test.tsx __tests__/screens/transactions/search_row.test.tsx __tests__/screens/commitments/search_row.test.tsx
git commit -m "refactor: share compact search filter row"
```

---

## Task 2: Shared Filter Accordion Primitives

**Files:**
- Create: `__tests__/components/ui/filter_accordion.test.tsx`
- Create: `src/components/ui/filter_accordion.tsx`

- [ ] **Step 1: Write the failing shared accordion test**

Create `__tests__/components/ui/filter_accordion.test.tsx` with tests for shell, pill list, and amount content:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  AmountRangeFilterContent,
  FilterAccordionShell,
  FilterOptionPillList,
} from '@/components/ui/filter_accordion';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Accordion: Object.assign(({ children }: { children?: ReactNode }) => <View>{children}</View>, {
      Item: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
      Trigger: ({ children, ...props }: { children?: ReactNode }) => (
        <Pressable {...props}>{children}</Pressable>
      ),
      Content: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
      Indicator: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    }),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});
jest.mock('@/components/ui/chip', () => ({
  SelectablePill: ({
    label,
    selected,
    onPress,
    accessibilityLabel,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
    accessibilityLabel: string;
  }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Pressable accessibilityLabel={accessibilityLabel} accessibilityState={{ selected }} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/components/ui/tabs', () => ({
  SegmentedTabs: ({
    segments,
    value,
    onValueChange,
    accessibilityLabel,
  }: {
    segments: ReadonlyArray<{ value: Currency; label: string }>;
    value: Currency;
    onValueChange: (value: Currency) => void;
    accessibilityLabel: string;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View accessibilityLabel={accessibilityLabel}>
        {segments.map((segment) => (
          <Pressable key={segment.value} onPress={() => onValueChange(segment.value)}>
            <Text>{segment.label === value ? `${segment.label} selected` : segment.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));
jest.mock('@/components/ui/input', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { TextInput } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Input: (props: object) => ReactLocal.createElement(TextInput, props),
  };
});

describe('FilterAccordionShell', () => {
  it('renders title, count, collapsed summary, and children', () => {
    const onToggle = jest.fn();
    const { getByText } = render(
      <FilterAccordionShell
        title="Accounts"
        count={2}
        summary="CIB, Cash"
        expanded={false}
        onToggle={onToggle}
      >
        <FilterOptionPillList
          options={[
            { id: 'cib', label: 'CIB', selected: true, accessibilityLabel: 'CIB account filter' },
          ]}
          onToggle={jest.fn()}
        />
      </FilterAccordionShell>,
    );

    expect(getByText('Accounts')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('CIB, Cash')).toBeTruthy();
    expect(getByText('CIB')).toBeTruthy();
    fireEvent.press(getByText('Accounts'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('hides summary while expanded', () => {
    const { queryByText } = render(
      <FilterAccordionShell
        title="Categories"
        count={0}
        summary="All categories"
        expanded
        onToggle={jest.fn()}
      >
        <></>
      </FilterAccordionShell>,
    );

    expect(queryByText('All categories')).toBeNull();
  });
});

describe('FilterOptionPillList', () => {
  it('renders options and calls onToggle with the option id', () => {
    const onToggle = jest.fn();
    const { getByLabelText } = render(
      <FilterOptionPillList
        options={[
          { id: 'food', label: 'Food', selected: false, accessibilityLabel: 'Food category filter' },
        ]}
        onToggle={onToggle}
      />,
    );

    fireEvent.press(getByLabelText('Food category filter'));
    expect(onToggle).toHaveBeenCalledWith('food');
  });
});

describe('AmountRangeFilterContent', () => {
  it('renders currency tabs and min/max inputs', () => {
    const onChangeCurrency = jest.fn();
    const onChangeMinText = jest.fn();
    const onChangeMaxText = jest.fn();
    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <AmountRangeFilterContent
        amountCurrency={Currency.EGP}
        minValue="100"
        maxValue=""
        onChangeCurrency={onChangeCurrency}
        onChangeMinText={onChangeMinText}
        onChangeMaxText={onChangeMaxText}
        accessibilityLabel="Amount currency"
      />,
    );

    expect(getByLabelText('Amount currency')).toBeTruthy();
    expect(getByText('EGP selected')).toBeTruthy();
    fireEvent.press(getByText('USD'));
    expect(onChangeCurrency).toHaveBeenCalledWith(Currency.USD);

    fireEvent.changeText(getByPlaceholderText('0'), '200');
    expect(onChangeMinText).toHaveBeenCalledWith('200');

    fireEvent.changeText(getByPlaceholderText('∞'), '500');
    expect(onChangeMaxText).toHaveBeenCalledWith('500');
    expect(getByText(Strings.filterAmountMinLabel)).toBeTruthy();
    expect(getByText(Strings.filterAmountMaxLabel)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the shared accordion test and verify it fails**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/ui/filter_accordion.test.tsx
```

Expected: FAIL with module-not-found for `@/components/ui/filter_accordion`.

- [ ] **Step 3: Implement shared filter accordion primitives**

Create `src/components/ui/filter_accordion.tsx` with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion } from 'heroui-native';
import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';

import { SelectablePill } from './chip';
import { Input } from './input';
import { SegmentedTabs } from './tabs';
import { Text } from './text';

interface FilterAccordionShellProps {
  title: string;
  count: number;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export interface FilterOptionPillViewModel<T extends string = string> {
  id: T;
  label: string;
  selected: boolean;
  accessibilityLabel: string;
  startIcon?: ReactNode;
}

interface FilterOptionPillListProps<T extends string = string> {
  options: FilterOptionPillViewModel<T>[];
  onToggle: (id: T) => void;
}

interface AmountRangeFilterContentProps {
  amountCurrency: Currency;
  minValue: string;
  maxValue: string;
  onChangeCurrency: (currency: Currency) => void;
  onChangeMinText: (value: string) => void;
  onChangeMaxText: (value: string) => void;
  accessibilityLabel: string;
}

export function FilterAccordionShell({
  title,
  count,
  summary,
  expanded,
  onToggle,
  children,
}: FilterAccordionShellProps): React.ReactElement {
  return (
    <View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
      <Accordion
        selectionMode="single"
        value={expanded ? 'section' : ''}
        onValueChange={(_value: string | undefined) => onToggle()}
      >
        <Accordion.Item value="section">
          <Accordion.Trigger className="gap-0 px-0 py-0" style={{ padding: 0, gap: 0 }}>
            <View className="flex-row items-center justify-between" style={{ flex: 1 }}>
              <View className="flex-row items-center gap-2">
                <Text className="font-inter text-[13px] font-semibold">{title}</Text>
                {count > 0 ? (
                  <View className="bg-accent/15 min-w-[18px] items-center rounded-full px-1.5">
                    <Text className="font-inter text-accent text-[10px] font-bold">{count}</Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1.5">
                <Text className="font-inter text-foreground/60 text-[11px]" numberOfLines={1}>
                  {expanded ? '' : summary}
                </Text>
                <Accordion.Indicator isAnimatedStyleActive={false}>
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={CoreTokens.text2}
                  />
                </Accordion.Indicator>
              </View>
            </View>
          </Accordion.Trigger>
          <Accordion.Content className="px-0 pb-0" style={{ padding: 0 }}>
            {children}
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </View>
  );
}

export function FilterOptionPillList<T extends string = string>({
  options,
  onToggle,
}: FilterOptionPillListProps<T>): React.ReactElement {
  return (
    <View className="mt-3 flex-row flex-wrap gap-1.5">
      {options.map((option) => (
        <SelectablePill
          key={option.id}
          label={option.label}
          selected={option.selected}
          onPress={() => onToggle(option.id)}
          startIcon={option.startIcon}
          checkable
          accessibilityLabel={option.accessibilityLabel}
        />
      ))}
    </View>
  );
}

export function AmountRangeFilterContent({
  amountCurrency,
  minValue,
  maxValue,
  onChangeCurrency,
  onChangeMinText,
  onChangeMaxText,
  accessibilityLabel,
}: AmountRangeFilterContentProps): React.ReactElement {
  return (
    <View className="mt-3">
      <SegmentedTabs<Currency>
        segments={[
          { value: Currency.EGP, label: Currency.EGP },
          { value: Currency.USD, label: Currency.USD },
        ]}
        value={amountCurrency}
        onValueChange={onChangeCurrency}
        variant="solid-gold"
        listClassName="w-full mb-3"
        accessibilityLabel={accessibilityLabel}
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="font-inter text-foreground/55 mb-1 text-[10px] font-semibold uppercase">
            {Strings.filterAmountMinLabel}
          </Text>
          <Input
            value={minValue}
            onChangeText={onChangeMinText}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>
        <View className="flex-1">
          <Text className="font-inter text-foreground/55 mb-1 text-[10px] font-semibold uppercase">
            {Strings.filterAmountMaxLabel}
          </Text>
          <Input
            value={maxValue}
            onChangeText={onChangeMaxText}
            keyboardType="decimal-pad"
            placeholder="∞"
          />
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run the shared accordion test and verify it passes**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/ui/filter_accordion.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add src/components/ui/filter_accordion.tsx __tests__/components/ui/filter_accordion.test.tsx
git commit -m "refactor: add shared filter accordion primitives"
```

---

## Task 3: Refactor Domain Filter Accordions

**Files:**
- Modify: `src/modules/transactions/screens/transactions/filter/components/account_accordion.tsx`
- Modify: `src/modules/transactions/screens/transactions/filter/components/category_accordion.tsx`
- Modify: `src/modules/transactions/screens/transactions/filter/components/amount_accordion.tsx`
- Modify: `src/modules/commitments/screens/commitments/filter/components/account_accordion.tsx`
- Modify: `src/modules/commitments/screens/commitments/filter/components/category_accordion.tsx`
- Modify: `src/modules/commitments/screens/commitments/filter/components/amount_accordion.tsx`
- Modify: `src/modules/commitments/screens/commitments/filter/components/amount_type_accordion.tsx`
- Modify: `src/modules/commitments/screens/commitments/filter/components/recurrence_accordion.tsx`
- Modify: `__tests__/screens/filter_component_architecture.test.ts`

- [ ] **Step 1: Extend the architecture test first**

Update `__tests__/screens/filter_component_architecture.test.ts` to include the two new shared files and forbid domain helper/store imports:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const FILTER_COMPONENTS = [
  'src/components/ui/search_filter_row.tsx',
  'src/components/ui/filter_accordion.tsx',
  'src/modules/transactions/screens/transactions/filter/components/account_accordion.tsx',
  'src/modules/transactions/screens/transactions/filter/components/category_accordion.tsx',
  'src/modules/transactions/screens/transactions/filter/components/amount_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/account_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/category_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/amount_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/amount_type_accordion.tsx',
  'src/modules/commitments/screens/commitments/filter/components/recurrence_accordion.tsx',
];

const FORBIDDEN_DOMAIN_IMPORTS = [
  '../filter.helpers',
  '../filter.store',
  '../filter.hook',
  '@/modules/transactions/screens/transactions/filter/filter.helpers',
  '@/modules/commitments/screens/commitments/filter/filter.helpers',
];

describe('filter component architecture', () => {
  it('keeps filter components presentational without local React state or helper logic', () => {
    for (const path of FILTER_COMPONENTS) {
      const text = source(path);

      expect(text).not.toMatch(/\buse(?:Callback|Effect|Memo|Reducer|State)\b/);
      for (const forbiddenImport of FORBIDDEN_DOMAIN_IMPORTS) {
        expect(text).not.toContain(forbiddenImport);
      }
    }
  });
});
```

- [ ] **Step 2: Run the architecture test and verify it fails**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/filter_component_architecture.test.ts
```

Expected: FAIL until the shared files exist and wrappers are refactored, or PASS for shared files already created in Tasks 1-2 and still validates no forbidden hooks/imports. If it passes at this point, continue; the test is still guarding the next edits.

- [ ] **Step 3: Refactor account/category wrappers**

Use `FilterAccordionShell` and `FilterOptionPillList` in each account/category wrapper. For transaction accounts, the mapping should look like:

```tsx
const options = accounts.map((account) => ({
  id: account.id,
  label: account.name,
  selected: selectedIds.includes(account.id),
  accessibilityLabel: `${account.name}, account filter`,
  startIcon: (
    <MaterialCommunityIcons
      name={TYPE_OPTIONS.find((option) => option.type === account.type)?.icon ?? 'bank'}
      size={ms(13)}
      color={account.color ?? CoreTokens.text2}
    />
  ),
}));

return (
  <FilterAccordionShell
    title={Strings.filterSectionAccounts}
    count={selectedCount}
    summary={summary}
    expanded={expanded}
    onToggle={onToggleSection}
  >
    <FilterOptionPillList options={options} onToggle={onToggleId} />
  </FilterAccordionShell>
);
```

Keep the commitment wrapper accessibility labels domain-specific:

```tsx
accessibilityLabel: `${account.name}, commitment account filter`
```

For category wrappers, use:

```tsx
const options = categories.map((category) => ({
  id: category.id,
  label: category.name,
  selected: selectedIds.includes(category.id),
  accessibilityLabel: `${category.name}, category filter`,
  startIcon: (
    <MaterialCommunityIcons
      name={toIconName(category.icon, 'tag')}
      size={ms(13)}
      color={category.color ?? CoreTokens.text2}
    />
  ),
}));
```

For commitment categories, preserve the domain-specific label and existing direct color value:

```tsx
accessibilityLabel: `${category.name}, commitment category filter`
color={category.color}
```

- [ ] **Step 4: Refactor amount wrappers**

Use `FilterAccordionShell` and `AmountRangeFilterContent`. Transaction amount wrapper body:

```tsx
return (
  <FilterAccordionShell
    title={Strings.filterSectionAmount}
    count={active ? 1 : 0}
    summary={summary}
    expanded={expanded}
    onToggle={onToggleSection}
  >
    <AmountRangeFilterContent
      amountCurrency={amountCurrency}
      minValue={minValue}
      maxValue={maxValue}
      onChangeCurrency={onChangeCurrency}
      onChangeMinText={onChangeMinText}
      onChangeMaxText={onChangeMaxText}
      accessibilityLabel="Amount currency"
    />
  </FilterAccordionShell>
);
```

Commitment amount wrapper should use:

```tsx
accessibilityLabel="Commitment amount currency"
```

- [ ] **Step 5: Refactor commitment amount-type and recurrence wrappers**

Map local option objects to `FilterOptionPillList`. Amount type mapping:

```tsx
const options = COMMITMENT_AMOUNT_TYPE_OPTIONS.map((option) => ({
  id: option.value,
  label: option.label,
  selected: selectedTypes.includes(option.value),
  accessibilityLabel: `${option.label}, amount type filter`,
  startIcon: (
    <MaterialCommunityIcons name={option.icon} size={ms(13)} color={CoreTokens.text2} />
  ),
}));
```

Recurrence mapping:

```tsx
const options = COMMITMENT_RECURRENCE_OPTIONS.map((option) => ({
  id: option.value,
  label: option.label,
  selected: selectedPresets.includes(option.value),
  accessibilityLabel: `${option.label}, recurrence filter`,
  startIcon: (
    <MaterialCommunityIcons name={option.icon} size={ms(13)} color={CoreTokens.text2} />
  ),
}));
```

Because `FilterOptionPillList` preserves typed option IDs, pass callbacks directly:

```tsx
<FilterOptionPillList options={options} onToggle={onToggleType} />
```

and

```tsx
<FilterOptionPillList options={options} onToggle={onTogglePreset} />
```

- [ ] **Step 6: Run filter-related tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/ui/filter_accordion.test.tsx __tests__/screens/filter_component_architecture.test.ts __tests__/screens/transactions/filter/filter_sheet.test.tsx __tests__/screens/commitments/filter/filter_sheet.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Run TypeScript check**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

Run:

```bash
git add src/modules/transactions/screens/transactions/filter/components src/modules/commitments/screens/commitments/filter/components __tests__/screens/filter_component_architecture.test.ts
git commit -m "refactor: share filter accordion presentation"
```

---

## Task 4: Verification and PR Readiness

**Files:**
- Inspect all changed files.
- No new production files unless a previous task exposed a compile issue.

- [ ] **Step 1: Run focused search/filter tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/ui/search_filter_row.test.tsx __tests__/components/ui/filter_accordion.test.tsx __tests__/screens/filter_component_architecture.test.ts __tests__/screens/transactions/search_row.test.tsx __tests__/screens/commitments/search_row.test.tsx __tests__/screens/transactions/filter/filter_sheet.test.tsx __tests__/screens/commitments/filter/filter_sheet.test.tsx __tests__/screens/transactions/filter/filter_hook.test.ts __tests__/screens/commitments/filter/filter_hook.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run direct architecture scan**

Run:

```bash
rg -n "useState|useEffect|useMemo|useCallback|useReducer|../filter.helpers|../filter.store|../filter.hook" src/components/ui/search_filter_row.tsx src/components/ui/filter_accordion.tsx src/modules/transactions/screens/transactions/filter/components src/modules/commitments/screens/commitments/filter/components
```

Expected: no matches, exit code 1.

- [ ] **Step 3: Run formatting and lint**

Run:

```bash
npm run format:check -- src/components/ui/search_filter_row.tsx src/components/ui/filter_accordion.tsx src/modules/transactions/screens/transactions/components/search_row.tsx src/modules/commitments/screens/commitments/components/search_row.tsx src/modules/transactions/screens/transactions/filter/components src/modules/commitments/screens/commitments/filter/components __tests__/components/ui/search_filter_row.test.tsx __tests__/components/ui/filter_accordion.test.tsx __tests__/screens/filter_component_architecture.test.ts
npm run lint -- src/components/ui/search_filter_row.tsx src/components/ui/filter_accordion.tsx src/modules/transactions/screens/transactions/components/search_row.tsx src/modules/commitments/screens/commitments/components/search_row.tsx src/modules/transactions/screens/transactions/filter/components src/modules/commitments/screens/commitments/filter/components __tests__/components/ui/search_filter_row.test.tsx __tests__/components/ui/filter_accordion.test.tsx __tests__/screens/filter_component_architecture.test.ts
```

Expected: both commands exit 0.

- [ ] **Step 4: Run full typecheck and unit suite**

Run:

```bash
npm run typecheck
npm test -- --ci
```

Expected: both commands exit 0.

- [ ] **Step 5: Run full pre-push CI parity before any PR push**

Run:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "CI parity green - safe to push"
```

Expected: command exits 0 and prints `CI parity green - safe to push`.

- [ ] **Step 6: Prepare manual QA checklist for PR description**

Add this checklist to the PR body:

```markdown
## Manual Device QA
- [ ] Transactions search row remains compact and clear button does not overlap text.
- [ ] Transactions filter badge appears and updates after applying filters.
- [ ] Transactions reset/apply works for accounts, categories, and amount range.
- [ ] Commitments search row matches Transactions spacing.
- [ ] Commitments filter badge appears and updates after applying filters.
- [ ] Commitments reset/apply works for accounts, categories, amount range, amount type, and recurrence.
```

- [ ] **Step 7: Commit final verification note if docs changed**

If only PR body text is needed, do not create a commit. If a tracked QA doc was changed, run:

```bash
git add <changed-doc-path>
git commit -m "docs: add shared filter qa checklist"
```

Expected: no commit unless a tracked doc changed.
