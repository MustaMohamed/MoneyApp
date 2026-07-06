# Transactions Search Filter Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Transactions search/filter surface into a compact command row and equal-width themed Reset/Apply filter-sheet footer.

**Architecture:** Keep filtering state in the existing transactions/filter Zustand stores. Add small helper functions for applied-filter equality and concise summaries, then compose the UI with existing project wrappers (`Input`, `Button`, `Sheet`, `Accordion`, `PressableFeedback`) instead of introducing a new primitive.

**Tech Stack:** Expo React Native, TypeScript strict, Zustand, HeroUI Native, React Native Testing Library, Jest.

---

## File Map

- Create: `__tests__/screens/transactions/filter/filter_helpers.test.ts`
  - Covers advanced-filter equality and concise applied-filter summary text.
- Create: `__tests__/screens/transactions/search_row.test.tsx`
  - Covers compact search row behavior and filter badge rendering.
- Create: `__tests__/screens/transactions/date_header.test.tsx`
  - Covers optional right-side applied-filter context in date/list headers.
- Create: `__tests__/screens/transactions/filter/filter_hook.test.ts`
  - Covers reset/apply behavior and clearing already-applied filters.
- Create: `__tests__/screens/transactions/filter/filter_sheet.test.tsx`
  - Covers themed equal-width Reset/Apply footer rendering.
- Modify: `src/modules/transactions/screens/transactions/filter/filter.helpers.ts`
  - Add `advancedFiltersEqual()` and `formatAppliedFilterSummary()`.
- Modify: `src/modules/transactions/screens/transactions/components/search_row.tsx`
  - Compact the search/filter command row and keep the filter icon at the end.
- Modify: `src/modules/transactions/screens/transactions/components/date_header.tsx`
  - Add optional right-side context text.
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
  - Derive `appliedFilterSummary` from applied filters and entity maps.
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
  - Pass `appliedFilterSummary` into section headers.
- Modify: `src/modules/transactions/screens/transactions/filter/filter.hook.ts`
  - Expose `canApply` based on draft-vs-applied equality.
- Modify: `src/modules/transactions/screens/transactions/filter/index.tsx`
  - Move Reset beside Apply in an equal-width sheet footer using existing `Button` variants.

## Task 1: Advanced Filter Helper Contract

**Files:**
- Create: `__tests__/screens/transactions/filter/filter_helpers.test.ts`
- Modify: `src/modules/transactions/screens/transactions/filter/filter.helpers.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `__tests__/screens/transactions/filter/filter_helpers.test.ts`:

```ts
import { Currency } from '@/constants/enums';
import {
  advancedFiltersEqual,
  formatAppliedFilterSummary,
  countActiveFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.helpers';
import {
  EMPTY_FILTERS_V2,
  type AdvancedFilters,
} from '@/modules/transactions/screens/transactions/filter/filter.store';

describe('advancedFiltersEqual', () => {
  it('treats empty filters as equal', () => {
    expect(advancedFiltersEqual(EMPTY_FILTERS_V2, { ...EMPTY_FILTERS_V2 })).toBe(true);
  });

  it('ignores id order for account and category selections', () => {
    const a: AdvancedFilters = {
      ...EMPTY_FILTERS_V2,
      accountIds: ['a2', 'a1'],
      categoryIds: ['c2', 'c1'],
    };
    const b: AdvancedFilters = {
      ...EMPTY_FILTERS_V2,
      accountIds: ['a1', 'a2'],
      categoryIds: ['c1', 'c2'],
    };
    expect(advancedFiltersEqual(a, b)).toBe(true);
  });

  it('detects amount range differences', () => {
    expect(
      advancedFiltersEqual(
        { ...EMPTY_FILTERS_V2, amountMin: 100 },
        { ...EMPTY_FILTERS_V2, amountMin: 101 },
      ),
    ).toBe(false);
  });

  it('ignores amount currency when neither side has an amount range', () => {
    expect(
      advancedFiltersEqual(
        { ...EMPTY_FILTERS_V2, amountCurrency: Currency.EGP },
        { ...EMPTY_FILTERS_V2, amountCurrency: Currency.USD },
      ),
    ).toBe(true);
  });

  it('compares amount currency when an amount range is active', () => {
    expect(
      advancedFiltersEqual(
        { ...EMPTY_FILTERS_V2, amountCurrency: Currency.EGP, amountMin: 100 },
        { ...EMPTY_FILTERS_V2, amountCurrency: Currency.USD, amountMin: 100 },
      ),
    ).toBe(false);
  });
});

describe('formatAppliedFilterSummary', () => {
  const accounts = new Map([
    ['a1', { name: 'CIB' }],
    ['a2', { name: 'Wallet' }],
  ]);
  const categories = new Map([
    ['c1', { name: 'Food' }],
    ['c2', { name: 'Groceries' }],
  ]);

  it('returns null when there are no applied filters', () => {
    expect(formatAppliedFilterSummary(EMPTY_FILTERS_V2, accounts, categories)).toBeNull();
  });

  it('combines account and category names for concise list-header context', () => {
    expect(
      formatAppliedFilterSummary(
        { ...EMPTY_FILTERS_V2, accountIds: ['a1'], categoryIds: ['c1'] },
        accounts,
        categories,
      ),
    ).toBe('CIB + Food');
  });

  it('uses existing selection summary formatting for multiple selected names', () => {
    expect(
      formatAppliedFilterSummary(
        { ...EMPTY_FILTERS_V2, accountIds: ['a1', 'a2'], categoryIds: ['c1', 'c2'] },
        accounts,
        categories,
      ),
    ).toBe('CIB, Wallet + Food, Groceries');
  });

  it('includes amount summary when amount filters are active', () => {
    expect(
      formatAppliedFilterSummary(
        { ...EMPTY_FILTERS_V2, amountCurrency: Currency.EGP, amountMin: 500 },
        accounts,
        categories,
      ),
    ).toBe('From 500 EGP');
  });
});

describe('countActiveFilters', () => {
  it('keeps existing active-filter counting behavior', () => {
    expect(
      countActiveFilters({
        ...EMPTY_FILTERS_V2,
        accountIds: ['a1'],
        categoryIds: ['c1'],
        amountMin: 100,
      }),
    ).toBe(3);
  });
});
```

- [ ] **Step 2: Run the helper test and verify it fails**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/filter/filter_helpers.test.ts
```

Expected: FAIL because `advancedFiltersEqual` and `formatAppliedFilterSummary` are not exported yet.

- [ ] **Step 3: Implement the helper functions**

Append these helpers to `src/modules/transactions/screens/transactions/filter/filter.helpers.ts`:

```ts
type NamedEntity = { name: string };

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((id, index) => id === right[index]);
}

function hasAmountFilter(f: AdvancedFilters): boolean {
  return f.amountMin !== undefined || f.amountMax !== undefined;
}

export function advancedFiltersEqual(a: AdvancedFilters, b: AdvancedFilters): boolean {
  const amountActive = hasAmountFilter(a) || hasAmountFilter(b);
  return (
    sameStringSet(a.accountIds, b.accountIds) &&
    sameStringSet(a.categoryIds, b.categoryIds) &&
    a.amountMin === b.amountMin &&
    a.amountMax === b.amountMax &&
    (!amountActive || a.amountCurrency === b.amountCurrency)
  );
}

function selectedNames(ids: string[], source: ReadonlyMap<string, NamedEntity>): string[] {
  return ids.map((id) => source.get(id)?.name).filter((name): name is string => name !== undefined);
}

export function formatAppliedFilterSummary(
  f: AdvancedFilters,
  accountsById: ReadonlyMap<string, NamedEntity>,
  categoriesById: ReadonlyMap<string, NamedEntity>,
): string | null {
  const parts: string[] = [];
  const accountNames = selectedNames(f.accountIds, accountsById);
  const categoryNames = selectedNames(f.categoryIds, categoriesById);

  if (accountNames.length > 0) parts.push(formatSelectionSummary(accountNames, ''));
  if (categoryNames.length > 0) parts.push(formatSelectionSummary(categoryNames, ''));
  if (hasAmountFilter(f)) parts.push(formatAmountSummary(f));

  return parts.length > 0 ? parts.join(' + ') : null;
}
```

- [ ] **Step 4: Run the helper test and verify it passes**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/filter/filter_helpers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add src/modules/transactions/screens/transactions/filter/filter.helpers.ts __tests__/screens/transactions/filter/filter_helpers.test.ts
git commit -m "test: cover transactions filter helpers"
```

## Task 2: Compact Search Command Row

**Files:**
- Create: `__tests__/screens/transactions/search_row.test.tsx`
- Modify: `src/modules/transactions/screens/transactions/components/search_row.tsx`

- [ ] **Step 1: Write the failing SearchRow tests**

Create `__tests__/screens/transactions/search_row.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { TextInput } from 'react-native';

import {
  FILTER_BUTTON_COMPACT_STYLE,
  SEARCH_INPUT_COMPACT_STYLE,
  SearchRow,
} from '@/modules/transactions/screens/transactions/components/search_row';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PressableFeedback: ({
      children,
      ...props
    }: {
      children?: ReactNode;
      onPress?: () => void;
      accessibilityLabel?: string;
      accessibilityRole?: string;
    }) => <Pressable {...props}>{children}</Pressable>,
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});
jest.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<typeof TextInput>) => <TextInput {...props} />,
}));

describe('SearchRow', () => {
  it('renders the compact search input and trailing filter button', () => {
    const { getByLabelText } = render(
      <SearchRow
        value=""
        onChange={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );

    expect(getByLabelText('Search transactions…').props.style).toEqual(
      expect.arrayContaining([SEARCH_INPUT_COMPACT_STYLE]),
    );
    expect(getByLabelText('Filter').props.style).toEqual(FILTER_BUTTON_COMPACT_STYLE);
  });

  it('shows the active-filter badge only when advanced filters are applied', () => {
    const empty = render(
      <SearchRow
        value=""
        onChange={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={0}
      />,
    );
    expect(empty.queryByText('2')).toBeNull();

    const active = render(
      <SearchRow
        value=""
        onChange={jest.fn()}
        onClear={jest.fn()}
        onOpenFilter={jest.fn()}
        activeFilterCount={2}
      />,
    );
    expect(active.getByText('2')).toBeTruthy();
    expect(active.getByLabelText('Filter, 2 active')).toBeTruthy();
  });

  it('calls search, clear, and open-filter handlers', () => {
    const onChange = jest.fn();
    const onClear = jest.fn();
    const onOpenFilter = jest.fn();
    const { getByLabelText } = render(
      <SearchRow
        value="coffee"
        onChange={onChange}
        onClear={onClear}
        onOpenFilter={onOpenFilter}
        activeFilterCount={1}
      />,
    );

    fireEvent.changeText(getByLabelText('Search transactions…'), 'rent');
    expect(onChange).toHaveBeenCalledWith('rent');

    fireEvent.press(getByLabelText('Clear search'));
    expect(onClear).toHaveBeenCalled();

    fireEvent.press(getByLabelText('Filter, 1 active'));
    expect(onOpenFilter).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the SearchRow test and verify it fails**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/search_row.test.tsx
```

Expected: FAIL because the exported compact style constants do not exist and the current row is not compact.

- [ ] **Step 3: Implement the compact command row**

Modify `src/modules/transactions/screens/transactions/components/search_row.tsx` to follow this shape:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Colors, Radius } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { ms } from '@/utils/responsive';

interface Props {
  value: string;
  onChange: (s: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

const COMPACT_CONTROL_SIZE = ms(36);

export const SEARCH_INPUT_COMPACT_STYLE = {
  height: COMPACT_CONTROL_SIZE,
  paddingTop: 0,
  paddingBottom: 0,
} as const;

export const FILTER_BUTTON_COMPACT_STYLE = {
  height: COMPACT_CONTROL_SIZE,
  width: COMPACT_CONTROL_SIZE,
  borderRadius: Radius.md,
} as const;

export function SearchRow({
  value,
  onChange,
  onClear,
  onOpenFilter,
  activeFilterCount,
}: Props): React.ReactElement {
  return (
    <View className="mb-2 flex-row items-center gap-2 px-4">
      <View className="flex-1">
        <Input
          value={value}
          onChangeText={onChange}
          placeholder={Strings.searchTransactionsPlaceholder}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={Strings.searchTransactionsPlaceholder}
          style={SEARCH_INPUT_COMPACT_STYLE}
        />
        {value.length > 0 ? (
          <PressableFeedback
            onPress={onClear}
            hitSlop={8}
            accessibilityLabel="Clear search"
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
        accessibilityLabel={`Filter${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
        className="bg-default/40 relative items-center justify-center"
        style={FILTER_BUTTON_COMPACT_STYLE}
      >
        <MaterialCommunityIcons name="tune-variant" size={18} color={Colors.dark.text1} />
        {activeFilterCount > 0 ? (
          <View className="bg-accent absolute -top-1.5 -right-1.5 min-w-[16px] items-center rounded-full px-1.5">
            <Text className="font-inter text-accent-foreground text-[9px] font-bold">
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </PressableFeedback>
    </View>
  );
}
```

- [ ] **Step 4: Run the SearchRow test and verify it passes**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/search_row.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add src/modules/transactions/screens/transactions/components/search_row.tsx __tests__/screens/transactions/search_row.test.tsx
git commit -m "feat: compact transactions search row"
```

## Task 3: Applied Filter Context In List Headers

**Files:**
- Create: `__tests__/screens/transactions/date_header.test.tsx`
- Modify: `src/modules/transactions/screens/transactions/components/date_header.tsx`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`

- [ ] **Step 1: Write the DateHeader test**

Create `__tests__/screens/transactions/date_header.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';

import { DateHeader } from '@/modules/transactions/screens/transactions/components/date_header';

jest.mock('heroui-native', () => ({
  cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
}));

describe('DateHeader', () => {
  it('renders only the date label when no context is provided', () => {
    const { getByText, queryByText } = render(<DateHeader label="Today" />);

    expect(getByText('Today')).toBeTruthy();
    expect(queryByText('CIB + Food')).toBeNull();
  });

  it('renders right-aligned applied-filter context when provided', () => {
    const { getByText } = render(<DateHeader label="Today" contextLabel="CIB + Food" />);

    expect(getByText('Today')).toBeTruthy();
    expect(getByText('CIB + Food')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the DateHeader test and verify it fails**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/date_header.test.tsx
```

Expected: FAIL because `DateHeader` does not accept `contextLabel`.

- [ ] **Step 3: Update DateHeader**

Replace `src/modules/transactions/screens/transactions/components/date_header.tsx` with:

```tsx
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';

interface Props {
  label: string;
  contextLabel?: string | null;
}

export function DateHeader({ label, contextLabel }: Props): React.ReactElement {
  return (
    <View className="bg-background px-4 pt-3 pb-1.5">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
        <Text
          className="font-inter text-muted flex-1 text-[10px] font-semibold tracking-wide uppercase"
          numberOfLines={1}
        >
          {label}
        </Text>
        {contextLabel ? (
          <Text
            className="font-inter text-accent max-w-[55%] text-right text-[10px] font-bold"
            numberOfLines={1}
          >
            {contextLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Derive the applied-filter summary in the screen hook**

Modify `src/modules/transactions/screens/transactions/transactions.hook.ts`:

```ts
import {
  countActiveFilters,
  formatAppliedFilterSummary,
  toQueryFilters,
} from './filter/filter.helpers';
```

Then add this derived value after `activeFilterCount`:

```ts
const appliedFilterSummary = useMemo(
  () => formatAppliedFilterSummary(appliedFilters, accountsById, categoriesById),
  [accountsById, appliedFilters, categoriesById],
);
```

Return it in `state`:

```ts
activeFilterCount,
appliedFilterSummary,
totals,
previousLabel,
```

- [ ] **Step 5: Pass the context into section headers**

Modify `src/modules/transactions/screens/transactions/index.tsx`:

```tsx
const renderSectionHeader = useCallback(
  ({ section }: { section: SectionListData<Transaction, TransactionSection> }) => (
    <DateHeader label={section.key} contextLabel={state.appliedFilterSummary} />
  ),
  [state.appliedFilterSummary],
);
```

- [ ] **Step 6: Run DateHeader and helper tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/date_header.test.tsx __tests__/screens/transactions/filter/filter_helpers.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

Run:

```bash
git add src/modules/transactions/screens/transactions/components/date_header.tsx src/modules/transactions/screens/transactions/transactions.hook.ts src/modules/transactions/screens/transactions/index.tsx __tests__/screens/transactions/date_header.test.tsx
git commit -m "feat: show applied transaction filter context"
```

## Task 4: Filter Sheet Reset/Apply Behavior

**Files:**
- Create: `__tests__/screens/transactions/filter/filter_hook.test.ts`
- Modify: `src/modules/transactions/screens/transactions/filter/filter.hook.ts`

- [ ] **Step 1: Write the failing hook tests**

Create `__tests__/screens/transactions/filter/filter_hook.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react-native';

import { Currency } from '@/constants/enums';
import { useFilterSheet } from '@/modules/transactions/screens/transactions/filter/filter.hook';
import {
  EMPTY_FILTERS_V2,
  useFilterStore,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import { useTransactionsScreenStore } from '@/modules/transactions/screens/transactions/transactions.store';

beforeEach(() => {
  useFilterStore.getState().resetDraft();
  useTransactionsScreenStore.getState().reset();
});

describe('useFilterSheet apply/reset behavior', () => {
  it('disables Apply when draft and applied filters match', () => {
    const { result } = renderHook(() => useFilterSheet());

    expect(result.current.state.canApply).toBe(false);
  });

  it('enables Apply when the draft has new filters', () => {
    const { result } = renderHook(() => useFilterSheet());

    act(() => result.current.toggleAccountId('a1'));

    expect(result.current.state.draftCount).toBe(1);
    expect(result.current.state.canApply).toBe(true);
  });

  it('allows Reset then Apply to clear already-applied filters', () => {
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS_V2, accountIds: ['a1'] });
    useFilterStore.getState().setDraft({ ...EMPTY_FILTERS_V2, accountIds: ['a1'] });

    const { result } = renderHook(() => useFilterSheet());
    expect(result.current.state.canApply).toBe(false);

    act(() => result.current.resetDraft());
    expect(result.current.state.draft).toEqual(EMPTY_FILTERS_V2);
    expect(result.current.state.draftCount).toBe(0);
    expect(result.current.state.canApply).toBe(true);

    act(() => result.current.applyDraft());
    expect(useTransactionsScreenStore.getState().appliedFilters).toEqual(EMPTY_FILTERS_V2);
  });

  it('tracks amount-currency changes only when an amount range is active', () => {
    const { result } = renderHook(() => useFilterSheet());

    act(() => result.current.setAmountCurrency(Currency.USD));
    expect(result.current.state.canApply).toBe(false);

    act(() => result.current.setAmountMin(100));
    expect(result.current.state.canApply).toBe(true);
  });
});
```

- [ ] **Step 2: Run the hook test and verify it fails**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/filter/filter_hook.test.ts
```

Expected: FAIL because `state.canApply` is not exposed yet.

- [ ] **Step 3: Implement `canApply` in the filter hook**

Modify `src/modules/transactions/screens/transactions/filter/filter.hook.ts`:

```ts
import { advancedFiltersEqual, countActiveFilters } from './filter.helpers';
```

Then derive `canApply` after `draftCount`:

```ts
const draftCount = countActiveFilters(draft);
const canApply = !advancedFiltersEqual(draft, appliedFilters);
```

Return it in `state`:

```ts
state: {
  visible,
  openSection,
  draft,
  draftCount,
  canApply,
  accounts,
  categories,
},
```

- [ ] **Step 4: Run the hook test and verify it passes**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/filter/filter_hook.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add src/modules/transactions/screens/transactions/filter/filter.hook.ts __tests__/screens/transactions/filter/filter_hook.test.ts
git commit -m "feat: allow clearing transaction filters"
```

## Task 5: Equal-Width Themed Filter Sheet Footer

**Files:**
- Create: `__tests__/screens/transactions/filter/filter_sheet.test.tsx`
- Modify: `src/modules/transactions/screens/transactions/filter/index.tsx`

- [ ] **Step 1: Write the failing FilterSheet component tests**

Create `__tests__/screens/transactions/filter/filter_sheet.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Strings } from '@/constants/strings';
import {
  FILTER_SHEET_ACTION_STYLE,
  FilterSheet,
} from '@/modules/transactions/screens/transactions/filter';
import { EMPTY_FILTERS_V2 } from '@/modules/transactions/screens/transactions/filter/filter.store';

const close = jest.fn();
const resetDraft = jest.fn();
const applyDraft = jest.fn();

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetScrollView: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
jest.mock('@/components/ui/sheet', () => ({
  SHEET_FOOTER_CLEARANCE: 124,
  Sheet: ({
    isOpen,
    title,
    footer,
    children,
  }: {
    isOpen: boolean;
    title?: string;
    footer?: ReactNode;
    children?: ReactNode;
  }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    if (!isOpen) return null;
    return (
      <View>
        <Text>{title}</Text>
        {children}
        <View testID="sheet-footer">{footer}</View>
      </View>
    );
  },
}));
jest.mock('@/components/ui/button', () => ({
  Button: ({
    label,
    variant,
    onPress,
    isDisabled,
  }: {
    label: string;
    variant?: string;
    onPress?: () => void;
    isDisabled?: boolean;
  }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Pressable accessibilityRole="button" disabled={isDisabled} onPress={onPress}>
        <Text>{`${variant}:${label}`}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/modules/transactions/screens/transactions/filter/filter.hook', () => ({
  useFilterSheet: () => ({
    state: {
      visible: true,
      openSection: null,
      draft: EMPTY_FILTERS_V2,
      draftCount: 2,
      canApply: true,
      accounts: [],
      categories: [],
    },
    close,
    toggleSection: jest.fn(),
    resetDraft,
    toggleAccountId: jest.fn(),
    toggleCategoryId: jest.fn(),
    setAmountMin: jest.fn(),
    setAmountMax: jest.fn(),
    setAmountCurrency: jest.fn(),
    applyDraft,
  }),
}));
jest.mock('heroui-native', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Accordion: Object.assign(
      ({ children }: { children?: ReactNode }) => <View>{children}</View>,
      {
        Item: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
        Trigger: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
        Content: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
        Indicator: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
      },
    ),
    PressableFeedback: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

describe('FilterSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Reset and Apply as equal-width themed footer buttons', () => {
    const { getByText, getByTestId } = render(<FilterSheet />);

    expect(getByText(`secondary:${Strings.filterReset}`)).toBeTruthy();
    expect(getByText(`primary:${Strings.filterApplyWithCount(2)}`)).toBeTruthy();
    expect(getByTestId('filter-reset-action').props.style).toEqual(FILTER_SHEET_ACTION_STYLE);
    expect(getByTestId('filter-apply-action').props.style).toEqual(FILTER_SHEET_ACTION_STYLE);
  });

  it('wires Reset and Apply actions from the footer', () => {
    const { getByText } = render(<FilterSheet />);

    fireEvent.press(getByText(`secondary:${Strings.filterReset}`));
    expect(resetDraft).toHaveBeenCalled();

    fireEvent.press(getByText(`primary:${Strings.filterApplyWithCount(2)}`));
    expect(applyDraft).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/filter/filter_sheet.test.tsx
```

Expected: FAIL because the footer still has only Apply and `FILTER_SHEET_ACTION_STYLE` is not exported.

- [ ] **Step 3: Implement the equal-width footer**

Modify `src/modules/transactions/screens/transactions/filter/index.tsx`:

```tsx
import { Box } from '@/components/ui/box';
```

Add this exported style near the top:

```ts
export const FILTER_SHEET_ACTION_STYLE = { flex: 1 } as const;
```

Replace the current `footer={...}` with:

```tsx
footer={
  <Box style={{ flexDirection: 'row' }} className="gap-2">
    <Box testID="filter-reset-action" style={FILTER_SHEET_ACTION_STYLE}>
      <Button
        variant="secondary"
        label={Strings.filterReset}
        onPress={f.resetDraft}
        isDisabled={f.state.draftCount === 0}
      />
    </Box>
    <Box testID="filter-apply-action" style={FILTER_SHEET_ACTION_STYLE}>
      <Button
        variant="primary"
        label={
          f.state.draftCount > 0
            ? Strings.filterApplyWithCount(f.state.draftCount)
            : Strings.filterApply
        }
        onPress={f.applyDraft}
        isDisabled={!f.state.canApply}
      />
    </Box>
  </Box>
}
```

Remove the old top-right reset `PressableFeedback` block from the sheet body.

- [ ] **Step 4: Run the component and hook tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/screens/transactions/filter/filter_sheet.test.tsx __tests__/screens/transactions/filter/filter_hook.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

Run:

```bash
git add src/modules/transactions/screens/transactions/filter/index.tsx __tests__/screens/transactions/filter/filter_sheet.test.tsx
git commit -m "feat: add transaction filter footer actions"
```

## Task 6: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused transaction/filter tests**

Run:

```bash
npm test -- --runTestsByPath \
  __tests__/screens/transactions/filter/filter_helpers.test.ts \
  __tests__/screens/transactions/search_row.test.tsx \
  __tests__/screens/transactions/date_header.test.tsx \
  __tests__/screens/transactions/filter/filter_hook.test.ts \
  __tests__/screens/transactions/filter/filter_sheet.test.tsx \
  __tests__/screens/transactions/filter/filter_store.test.ts \
  __tests__/screens/transactions/filter/filter_state.test.ts \
  __tests__/screens/transactions/transactions_store.test.ts \
  __tests__/screens/transactions/totals_strip.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run local CI parity before pushing**

Run:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ CI parity green — safe to push"
```

Expected: PASS and prints `✓ CI parity green — safe to push`.

- [ ] **Step 3: Confirm the working tree is clean**

Run:

```bash
git status --short
```

Expected: clean working tree except ignored generated files.
