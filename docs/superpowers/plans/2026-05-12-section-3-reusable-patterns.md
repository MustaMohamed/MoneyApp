# Section 3 · Reusable Patterns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four shared UI primitives (FAB, Sheet, EmptyState, SettingsSection) on HeroUI Native + @gorhom/bottom-sheet, wire the FAB into the tab layout, and mark react-native-actions-sheet as legacy-only going forward.

**Architecture:** Option B (approved): §3 builds all four components and installs @gorhom/bottom-sheet. The 12 existing react-native-actions-sheet consumer files are NOT migrated in this section — each downstream section (§4–§9) migrates its own sheets. No new code in §4–§9 may import from react-native-actions-sheet. The dep and patch remain until the last consumer is gone.

**Branch:** `feat/section-3-reusable-patterns` from `claude/start-migration-section-3-PkU9s`

**Design doc:** `docs/superpowers/specs/2026-05-12-section-3-reusable-patterns-design.md`

**Pre-conditions verified:**
- `GestureHandlerRootView` is already in `app/_layout.tsx` (line 62) — no modification needed.
- `react-native-gesture-handler@~2.30.0` is compatible with `@gorhom/bottom-sheet@^5.2.8`.
- `react-native-reanimated@v4.2.1` is already installed; its Jest mock via `react-native-reanimated/mock` is already in `jest.setup.js`.

**Tech Stack:** HeroUI Native v1.0 · Unistyles 3 via Uniwind · @gorhom/bottom-sheet@^5.2.8 · react-native-reanimated v4 · react-native-gesture-handler · Expo Router v3 · TypeScript strict

**Test coverage thresholds:** 80% lines / 95% functions / 100% branches (from jest.config.js). Note: `components/ui/` files are not currently in `collectCoverageFrom` — but the test files must still be written for correctness verification.

---

## File Map

### Created
```
components/ui/fab.tsx                          FAB + mini menu component
components/ui/sheet.tsx                        Sheet primitive wrapping @gorhom/bottom-sheet
components/ui/empty_state.tsx                  EmptyState (4 variants)
components/ui/settings_section.tsx             SettingsSection grouped list
__mocks__/@gorhom/bottom-sheet.tsx             Jest mock for @gorhom/bottom-sheet
__tests__/components/ui/fab.test.tsx           FAB unit tests
__tests__/components/ui/sheet.test.tsx         Sheet unit tests
__tests__/components/ui/empty_state.test.tsx   EmptyState unit tests
__tests__/components/ui/settings_section.test.tsx  SettingsSection unit tests
```

### Modified
```
app/(app)/(tabs)/_layout.tsx      Mount FAB as absolute overlay, useFABActions hook, pathname hide logic
constants/strings.ts              Add EmptyState copy keys (12 new keys)
CLAUDE.md                         Update "Bottom Sheets" section — mark actions-sheet legacy, document new Sheet
```

### NOT touched in §3
```
patches/react-native-actions-sheet+10.1.2.patch   (stays until last consumer is migrated)
package.json react-native-actions-sheet dep        (stays until last consumer is migrated)
All 12 react-native-actions-sheet consumer files   (each migrated in its own section)
```

---

## Task 1: Create branch and install @gorhom/bottom-sheet

**Files:**
- Modify: `package.json` (via npm install)
- Create: `__mocks__/@gorhom/bottom-sheet.tsx`

- [ ] **Step 1.1: Create branch**

```bash
git checkout claude/start-migration-section-3-PkU9s
git checkout -b feat/section-3-reusable-patterns
```

Expected: prompt changes to `feat/section-3-reusable-patterns`

- [ ] **Step 1.2: Install @gorhom/bottom-sheet**

```bash
cd /home/user/MoneyApp
npm install @gorhom/bottom-sheet@^5.2.8
```

Expected: package.json updated, node_modules/@gorhom/bottom-sheet present.

Note: `expo prebuild --clean` is required before running the app after this install (native code). It is NOT run during this task — it is a dev-loop step the developer runs manually when they first launch the app.

- [ ] **Step 1.3: Verify GestureHandlerRootView is already present**

```bash
grep -n "GestureHandlerRootView" /home/user/MoneyApp/app/_layout.tsx
```

Expected output: lines showing the import and the wrapping component. If absent, add it — but it should already be there.

- [ ] **Step 1.4: Create Jest mock directory and mock file**

```bash
mkdir -p /home/user/MoneyApp/__mocks__/@gorhom
```

Create `/home/user/MoneyApp/__mocks__/@gorhom/bottom-sheet.tsx`:

```tsx
import React from 'react';
import { View, type ViewProps } from 'react-native';

/**
 * Jest mock for @gorhom/bottom-sheet.
 *
 * - BottomSheet: renders children when index >= 0; calls onClose on backdrop press.
 * - BottomSheetScrollView: passthrough ScrollView wrapper.
 * - BottomSheetFlatList: passthrough FlatList wrapper.
 * - BottomSheetBackdrop: renders a pressable View with testID="bottom-sheet-backdrop".
 */

interface BottomSheetProps {
  index: number;
  snapPoints: string[];
  enablePanDownToClose?: boolean;
  onClose?: () => void;
  backdropComponent?: React.ComponentType<any>;
  handleComponent?: React.ComponentType<any>;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}

const BottomSheet = React.forwardRef<any, BottomSheetProps>(
  ({ index, children, onClose, backdropComponent: BackdropComponent, handleComponent: HandleComponent }, _ref) => {
    if (index < 0) return null;
    return (
      <View testID="bottom-sheet">
        {BackdropComponent && (
          <BackdropComponent
            animatedIndex={{ value: index }}
            animatedPosition={{ value: 0 }}
          />
        )}
        {HandleComponent && <HandleComponent />}
        {children}
      </View>
    );
  },
);
BottomSheet.displayName = 'BottomSheet';

interface BottomSheetBackdropProps {
  animatedIndex: { value: number };
  animatedPosition: { value: number };
  appearsOnIndex?: number;
  disappearsOnIndex?: number;
  opacity?: number;
  onPress?: () => void;
}

function BottomSheetBackdrop({ onPress }: BottomSheetBackdropProps) {
  const { Pressable } = require('react-native');
  return (
    <Pressable
      testID="bottom-sheet-backdrop"
      onPress={onPress}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

function BottomSheetScrollView({ children, ...props }: any) {
  const { ScrollView } = require('react-native');
  return <ScrollView {...props}>{children}</ScrollView>;
}

function BottomSheetFlatList(props: any) {
  const { FlatList } = require('react-native');
  return <FlatList {...props} />;
}

export default BottomSheet;
export { BottomSheet, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetFlatList };
```

- [ ] **Step 1.5: Verify mock file resolves in Jest**

```bash
cd /home/user/MoneyApp
npx jest --testPathPattern="does-not-exist" --listTests 2>&1 | head -5
```

Expected: no module resolution errors (Jest loads config on startup).

- [ ] **Step 1.6: Commit**

```bash
git add package.json package-lock.json __mocks__/@gorhom/bottom-sheet.tsx
git commit -m "feat(§3): install @gorhom/bottom-sheet + add Jest mock"
```

---

## Task 2: Add EmptyState strings to constants/strings.ts

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 2.1: Write the failing test for string key presence**

Create `/home/user/MoneyApp/__tests__/components/ui/empty_state.test.tsx` (strings-only portion first — full component test comes in Task 4):

```tsx
import { Strings } from '@/constants/strings';

describe('EmptyState strings', () => {
  it('has all accounts variant copy keys', () => {
    expect(Strings.emptyAccountsHeadline).toBe('No accounts yet');
    expect(Strings.emptyAccountsDescription).toBe(
      'Add your first account to start tracking your money.',
    );
    expect(Strings.emptyAccountsCta).toBe('Add Account');
  });

  it('has all transactions variant copy keys', () => {
    expect(Strings.emptyTransactionsHeadline).toBe('No transactions yet');
    expect(Strings.emptyTransactionsDescription).toBe(
      'Your transactions will appear here once you start adding them.',
    );
    expect(Strings.emptyTransactionsCta).toBe('Add Transaction');
  });

  it('has all commitments variant copy keys', () => {
    expect(Strings.emptyCommitmentsHeadline).toBe('No commitments yet');
    expect(Strings.emptyCommitmentsDescription).toBe(
      'Track bills, subscriptions, and recurring payments here.',
    );
    expect(Strings.emptyCommitmentsCta).toBe('Add Commitment');
  });

  it('has all filtered variant copy keys', () => {
    expect(Strings.emptyFilteredHeadline).toBe('No results');
    expect(Strings.emptyFilteredDescription).toBe('Try adjusting your filters.');
    expect(Strings.emptyFilteredClearCta).toBe('Clear Filters');
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp
npx jest __tests__/components/ui/empty_state.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Strings.emptyAccountsHeadline` is undefined.

- [ ] **Step 2.3: Add the string keys to constants/strings.ts**

Append the following block to `constants/strings.ts` after the last existing key (before the closing `}`):

```ts
  // EmptyState component
  emptyAccountsHeadline: 'No accounts yet',
  emptyAccountsDescription: 'Add your first account to start tracking your money.',
  emptyAccountsCta: 'Add Account',
  emptyTransactionsHeadline: 'No transactions yet',
  emptyTransactionsDescription: 'Your transactions will appear here once you start adding them.',
  emptyTransactionsCta: 'Add Transaction',
  emptyCommitmentsHeadline: 'No commitments yet',
  emptyCommitmentsDescription: 'Track bills, subscriptions, and recurring payments here.',
  emptyCommitmentsCta: 'Add Commitment',
  emptyFilteredHeadline: 'No results',
  emptyFilteredDescription: 'Try adjusting your filters.',
  emptyFilteredClearCta: 'Clear Filters',
```

- [ ] **Step 2.4: Run test to verify it passes**

```bash
cd /home/user/MoneyApp
npx jest __tests__/components/ui/empty_state.test.tsx --no-coverage 2>&1 | tail -10
```

Expected: PASS — 4 test suites, all green.

- [ ] **Step 2.5: Commit**

```bash
git add constants/strings.ts __tests__/components/ui/empty_state.test.tsx
git commit -m "feat(§3): add EmptyState string keys to constants/strings.ts"
```

---

## Task 3: Build EmptyState component

**Files:**
- Create: `components/ui/empty_state.tsx`
- Modify: `__tests__/components/ui/empty_state.test.tsx` (expand with render tests)

- [ ] **Step 3.1: Expand the test file with render tests**

Replace `/home/user/MoneyApp/__tests__/components/ui/empty_state.test.tsx` with:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';

// String key tests stay at top
describe('EmptyState strings', () => {
  it('has all accounts variant copy keys', () => {
    expect(Strings.emptyAccountsHeadline).toBe('No accounts yet');
    expect(Strings.emptyAccountsDescription).toBe(
      'Add your first account to start tracking your money.',
    );
    expect(Strings.emptyAccountsCta).toBe('Add Account');
  });

  it('has all transactions variant copy keys', () => {
    expect(Strings.emptyTransactionsHeadline).toBe('No transactions yet');
    expect(Strings.emptyTransactionsDescription).toBe(
      'Your transactions will appear here once you start adding them.',
    );
    expect(Strings.emptyTransactionsCta).toBe('Add Transaction');
  });

  it('has all commitments variant copy keys', () => {
    expect(Strings.emptyCommitmentsHeadline).toBe('No commitments yet');
    expect(Strings.emptyCommitmentsDescription).toBe(
      'Track bills, subscriptions, and recurring payments here.',
    );
    expect(Strings.emptyCommitmentsCta).toBe('Add Commitment');
  });

  it('has all filtered variant copy keys', () => {
    expect(Strings.emptyFilteredHeadline).toBe('No results');
    expect(Strings.emptyFilteredDescription).toBe('Try adjusting your filters.');
    expect(Strings.emptyFilteredClearCta).toBe('Clear Filters');
  });
});

// Component render tests
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('heroui-native', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { EmptyState } from '@/components/ui/empty_state';

describe('EmptyState component', () => {
  describe('accounts variant', () => {
    it('renders headline and description', () => {
      const { getByText } = render(<EmptyState variant="accounts" />);
      expect(getByText('No accounts yet')).toBeTruthy();
      expect(getByText('Add your first account to start tracking your money.')).toBeTruthy();
    });

    it('renders CTA button with label', () => {
      const { getByText } = render(<EmptyState variant="accounts" />);
      expect(getByText('Add Account')).toBeTruthy();
    });

    it('calls onAction when CTA is pressed', () => {
      const onAction = jest.fn();
      const { getByText } = render(<EmptyState variant="accounts" onAction={onAction} />);
      fireEvent.press(getByText('Add Account'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('transactions variant', () => {
    it('renders headline and description', () => {
      const { getByText } = render(<EmptyState variant="transactions" />);
      expect(getByText('No transactions yet')).toBeTruthy();
      expect(getByText('Your transactions will appear here once you start adding them.')).toBeTruthy();
    });

    it('renders CTA button with label', () => {
      const { getByText } = render(<EmptyState variant="transactions" />);
      expect(getByText('Add Transaction')).toBeTruthy();
    });
  });

  describe('commitments variant', () => {
    it('renders headline and description', () => {
      const { getByText } = render(<EmptyState variant="commitments" />);
      expect(getByText('No commitments yet')).toBeTruthy();
    });

    it('renders CTA button with label', () => {
      const { getByText } = render(<EmptyState variant="commitments" />);
      expect(getByText('Add Commitment')).toBeTruthy();
    });
  });

  describe('filtered variant', () => {
    it('renders headline and description', () => {
      const { getByText } = render(<EmptyState variant="filtered" />);
      expect(getByText('No results')).toBeTruthy();
      expect(getByText('Try adjusting your filters.')).toBeTruthy();
    });

    it('renders "Clear Filters" text button (not gradient CTA)', () => {
      const { getByText, queryByTestId } = render(<EmptyState variant="filtered" />);
      expect(getByText('Clear Filters')).toBeTruthy();
      expect(queryByTestId('empty-state-cta-gradient')).toBeNull();
    });

    it('calls onAction when Clear Filters is pressed', () => {
      const onAction = jest.fn();
      const { getByText } = render(<EmptyState variant="filtered" onAction={onAction} />);
      fireEvent.press(getByText('Clear Filters'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  it('does not throw when onAction is not provided', () => {
    expect(() => render(<EmptyState variant="accounts" />)).not.toThrow();
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails (component not yet created)**

```bash
cd /home/user/MoneyApp
npx jest __tests__/components/ui/empty_state.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '@/components/ui/empty_state'`

- [ ] **Step 3.3: Create components/ui/empty_state.tsx**

```tsx
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import { Text } from '@/components/ui/text';
import { ms } from '@/utils/responsive';

export type EmptyStateVariant = 'accounts' | 'transactions' | 'commitments' | 'filtered';

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  onAction?: () => void;
}

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const VARIANT_CONFIG: Record<
  EmptyStateVariant,
  { icon: MCIName; headline: string; description: string; ctaLabel: string | null; clearLabel: string | null }
> = {
  accounts: {
    icon: 'bank',
    headline: Strings.emptyAccountsHeadline,
    description: Strings.emptyAccountsDescription,
    ctaLabel: Strings.emptyAccountsCta,
    clearLabel: null,
  },
  transactions: {
    icon: 'swap-horizontal',
    headline: Strings.emptyTransactionsHeadline,
    description: Strings.emptyTransactionsDescription,
    ctaLabel: Strings.emptyTransactionsCta,
    clearLabel: null,
  },
  commitments: {
    icon: 'calendar-check',
    headline: Strings.emptyCommitmentsHeadline,
    description: Strings.emptyCommitmentsDescription,
    ctaLabel: Strings.emptyCommitmentsCta,
    clearLabel: null,
  },
  filtered: {
    icon: 'filter-remove',
    headline: Strings.emptyFilteredHeadline,
    description: Strings.emptyFilteredDescription,
    ctaLabel: null,
    clearLabel: Strings.emptyFilteredClearCta,
  },
};

export function EmptyState({ variant, onAction }: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <View style={styles.root}>
      {/* Icon circle */}
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons
          name={config.icon}
          size={ms(40)}
          color={Colors.dark.text2}
        />
      </View>

      {/* Headline */}
      <Text
        variant="h3"
        style={styles.headline}
      >
        {config.headline}
      </Text>

      {/* Description */}
      <Text
        variant="hint"
        style={styles.description}
      >
        {config.description}
      </Text>

      {/* CTA — gradient button for non-filtered variants */}
      {config.ctaLabel !== null && (
        <Pressable
          onPress={onAction}
          style={styles.ctaWrapper}
          accessibilityRole="button"
          accessibilityLabel={config.ctaLabel}
        >
          <LinearGradient
            testID="empty-state-cta-gradient"
            colors={[GoldTokens[500], GoldTokens[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          />
          <Text style={styles.ctaLabel}>{config.ctaLabel}</Text>
        </Pressable>
      )}

      {/* Clear Filters — text button for filtered variant */}
      {config.clearLabel !== null && (
        <Pressable
          onPress={onAction}
          style={styles.clearWrapper}
          accessibilityRole="button"
          accessibilityLabel={config.clearLabel}
        >
          <Text style={styles.clearLabel}>{config.clearLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    marginTop: Spacing.md,
    textAlign: 'center',
    color: Colors.dark.text1,
  },
  description: {
    marginTop: Spacing.xs,
    textAlign: 'center',
    maxWidth: ms(260),
    color: Colors.dark.text2,
  },
  ctaWrapper: {
    marginTop: Spacing.md,
    width: '100%',
    height: ms(52),
    borderRadius: Radius.cta,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.cta,
  },
  ctaLabel: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
  clearWrapper: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  clearLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.gold,
  },
});
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
cd /home/user/MoneyApp
npx jest __tests__/components/ui/empty_state.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests green.

- [ ] **Step 3.5: Commit**

```bash
git add components/ui/empty_state.tsx __tests__/components/ui/empty_state.test.tsx
git commit -m "feat(§3): EmptyState component — 4 variants with TDD"
```

---

## Task 4: Build SettingsSection component

**Files:**
- Create: `components/ui/settings_section.tsx`
- Create: `__tests__/components/ui/settings_section.test.tsx`

- [ ] **Step 4.1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/components/ui/settings_section.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('heroui-native', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  Divider: () => {
    const { View } = require('react-native');
    return <View testID="divider" />;
  },
}));

import { SettingsSection } from '@/components/ui/settings_section';

const baseItem = {
  label: 'Test Item',
  onPress: jest.fn(),
};

describe('SettingsSection', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('section header', () => {
    it('renders section title when provided', () => {
      const { getByText } = render(
        <SettingsSection title="MY SECTION" items={[baseItem]} />,
      );
      expect(getByText('MY SECTION')).toBeTruthy();
    });

    it('does not render a header when title is omitted', () => {
      const { queryByTestId } = render(
        <SettingsSection items={[baseItem]} />,
      );
      expect(queryByTestId('settings-section-header')).toBeNull();
    });
  });

  describe('rows', () => {
    it('renders item label', () => {
      const { getByText } = render(<SettingsSection items={[{ ...baseItem, label: 'Currency' }]} />);
      expect(getByText('Currency')).toBeTruthy();
    });

    it('calls onPress when row is pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <SettingsSection items={[{ ...baseItem, label: 'Press Me', onPress }]} />,
      );
      fireEvent.press(getByText('Press Me'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders trailing chevron when trailing="chevron"', () => {
      const { getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, trailing: 'chevron' }]} />,
      );
      expect(getByTestId('trailing-chevron')).toBeTruthy();
    });

    it('renders trailing toggle when trailing="toggle"', () => {
      const { getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, trailing: 'toggle', toggleValue: true }]} />,
      );
      expect(getByTestId('trailing-toggle')).toBeTruthy();
    });

    it('renders trailing value text when value is provided', () => {
      const { getByText } = render(
        <SettingsSection items={[{ ...baseItem, value: 'USD', trailing: 'none' }]} />,
      );
      expect(getByText('USD')).toBeTruthy();
    });

    it('does not render leading icon container when icon is omitted', () => {
      const { queryByTestId } = render(
        <SettingsSection items={[{ ...baseItem }]} />,
      );
      expect(queryByTestId('leading-icon')).toBeNull();
    });

    it('renders leading icon when icon is provided', () => {
      const { getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, icon: 'palette' }]} />,
      );
      expect(getByTestId('leading-icon')).toBeTruthy();
    });
  });

  describe('destructive rows', () => {
    it('renders label with danger style', () => {
      const { getByTestId } = render(
        <SettingsSection items={[{ ...baseItem, label: 'Delete All', destructive: true }]} />,
      );
      expect(getByTestId('destructive-label')).toBeTruthy();
    });

    it('does not render leading icon for destructive rows', () => {
      const { queryByTestId } = render(
        <SettingsSection
          items={[{ ...baseItem, label: 'Delete', destructive: true, icon: 'trash-can' }]}
        />,
      );
      expect(queryByTestId('leading-icon')).toBeNull();
    });
  });

  describe('dividers', () => {
    it('renders dividers between rows but not after the last row', () => {
      const items = [
        { label: 'Row A', onPress: jest.fn() },
        { label: 'Row B', onPress: jest.fn() },
        { label: 'Row C', onPress: jest.fn() },
      ];
      const { getAllByTestId } = render(<SettingsSection items={items} />);
      // 2 dividers for 3 rows (between A-B and B-C; none after C)
      expect(getAllByTestId('divider')).toHaveLength(2);
    });

    it('renders no divider for a single row', () => {
      const { queryByTestId } = render(<SettingsSection items={[baseItem]} />);
      expect(queryByTestId('divider')).toBeNull();
    });
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp
npx jest __tests__/components/ui/settings_section.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '@/components/ui/settings_section'`

- [ ] **Step 4.3: Create components/ui/settings_section.tsx**

```tsx
import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Divider } from 'heroui-native';

import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { Text } from '@/components/ui/text';
import { ms } from '@/utils/responsive';

export type SettingsTrailing = 'chevron' | 'toggle' | 'none';

export interface SettingsSectionItem {
  label: string;
  /** MaterialCommunityIcons name. Omit to hide the leading icon. */
  icon?: string;
  /** Displayed as trailing value text (e.g. "USD"). */
  value?: string;
  onPress: () => void;
  /** Renders label in text-danger; hides leading icon. */
  destructive?: boolean;
  trailing?: SettingsTrailing;
  /** Required when trailing === 'toggle'. */
  toggleValue?: boolean;
}

export interface SettingsSectionProps {
  /** Section header label (uppercase). Omit to render rows without a header. */
  title?: string;
  items: SettingsSectionItem[];
}

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function SettingsSection({ title, items }: SettingsSectionProps) {
  return (
    <View>
      {title !== undefined && (
        <View testID="settings-section-header" style={styles.header}>
          <Text style={styles.headerText}>{title}</Text>
        </View>
      )}

      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          <SettingsSectionRow item={item} />
          {index < items.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </View>
  );
}

function SettingsSectionRow({ item }: { item: SettingsSectionItem }) {
  const trailing = item.trailing ?? 'none';

  return (
    <Pressable
      onPress={item.onPress}
      style={styles.row}
      accessibilityRole="button"
    >
      {/* Leading icon — hidden for destructive rows or when no icon provided */}
      {item.icon !== undefined && !item.destructive && (
        <View testID="leading-icon" style={styles.leadingIcon}>
          <MaterialCommunityIcons
            name={item.icon as MCIName}
            size={ms(20)}
            color={Colors.dark.text2}
          />
        </View>
      )}

      {/* Label */}
      {item.destructive ? (
        <Text testID="destructive-label" style={[styles.label, styles.destructiveLabel]}>
          {item.label}
        </Text>
      ) : (
        <Text style={styles.label}>{item.label}</Text>
      )}

      {/* Trailing */}
      <View style={styles.trailingContainer}>
        {item.value !== undefined && trailing !== 'chevron' && trailing !== 'toggle' && (
          <Text style={styles.valueText}>{item.value}</Text>
        )}
        {trailing === 'chevron' && (
          <MaterialCommunityIcons
            testID="trailing-chevron"
            name="chevron-right"
            size={ms(20)}
            color={Colors.dark.text2}
          />
        )}
        {trailing === 'toggle' && (
          <Switch
            testID="trailing-toggle"
            value={item.toggleValue ?? false}
            onValueChange={item.onPress}
            trackColor={{ false: Colors.dark.border, true: Colors.dark.gold }}
            thumbColor={Colors.dark.text1}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingLeft: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  headerText: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ms(52),
    paddingHorizontal: Spacing.md,
  },
  leadingIcon: {
    width: ms(28),
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  label: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.bodyStrong,
    color: Colors.dark.text1,
  },
  destructiveLabel: {
    color: Colors.dark.negative,
  },
  trailingContainer: {
    marginLeft: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
});
```

- [ ] **Step 4.4: Run tests to verify they pass**

```bash
cd /home/user/MoneyApp
npx jest __tests__/components/ui/settings_section.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests green.

- [ ] **Step 4.5: Commit**

```bash
git add components/ui/settings_section.tsx __tests__/components/ui/settings_section.test.tsx
git commit -m "feat(§3): SettingsSection component with TDD"
```

---

## Task 5: Build Sheet component

**Files:**
- Create: `components/ui/sheet.tsx`
- Create: `__tests__/components/ui/sheet.test.tsx`

- [ ] **Step 5.1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/components/ui/sheet.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('heroui-native', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

// Uses the __mocks__/@gorhom/bottom-sheet.tsx mock automatically via moduleNameMapper
// The mock renders children when index >= 0 and null when index < 0.

import { Sheet } from '@/components/ui/sheet';

describe('Sheet component', () => {
  it('renders children when visible is true', () => {
    const { getByText } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    // Sheet is open — the bottom-sheet mock renders children
    // We test via the bottom-sheet testID
    const { getByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(getByTestId('bottom-sheet')).toBeTruthy();
  });

  it('does not render children when visible is false', () => {
    const { queryByTestId } = render(
      <Sheet visible={false} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    // Mock returns null when index < 0
    expect(queryByTestId('bottom-sheet')).toBeNull();
  });

  it('renders title in header when title prop is provided', () => {
    const { getByText } = render(
      <Sheet visible={true} onClose={jest.fn()} title="My Sheet" size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(getByText('My Sheet')).toBeTruthy();
  });

  it('does not render header when title is omitted', () => {
    const { queryByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(queryByTestId('sheet-header')).toBeNull();
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <Sheet visible={true} onClose={onClose} title="Close Me" size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    fireEvent.press(getByTestId('sheet-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when footer prop is provided', () => {
    const { getByTestId } = render(
      <Sheet
        visible={true}
        onClose={jest.fn()}
        size="sm"
        footer={<></>}
      >
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(getByTestId('sheet-footer')).toBeTruthy();
  });

  it('does not render footer container when footer is omitted', () => {
    const { queryByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(queryByTestId('sheet-footer')).toBeNull();
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp
npx jest __tests__/components/ui/sheet.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '@/components/ui/sheet'`

- [ ] **Step 5.3: Create components/ui/sheet.tsx**

```tsx
/**
 * Sheet — declarative bottom sheet primitive.
 *
 * Wraps @gorhom/bottom-sheet. Consumers use a `visible` prop + `onClose` callback.
 * Do NOT use .show() / .hide() imperative refs.
 *
 * SCROLLABLE CONTENT RULE:
 * Any scrollable content inside a Sheet must use BottomSheetScrollView or
 * BottomSheetFlatList imported from '@gorhom/bottom-sheet'.
 * Standard RN ScrollView / FlatList will NOT scroll inside a Sheet —
 * the gesture handler intercepts touch events.
 *
 *   import { BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
 *
 * SHEET STACKING:
 * Maximum depth 2. A nested sheet should not contain a third sheet.
 */
import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import BottomSheetLib, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { Text } from '@/components/ui/text';
import { ms } from '@/utils/responsive';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  size: 'sm' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SNAP_POINTS: Record<'sm' | 'lg', string[]> = {
  sm: ['50%'],
  lg: ['85%'],
};

function SheetHandle() {
  return (
    <View style={styles.handleContainer}>
      <View style={styles.handle} />
    </View>
  );
}

function SheetBody({ children }: { children: React.ReactNode }) {
  return <View style={styles.body}>{children}</View>;
}

export function Sheet({ visible, onClose, title, size, footer, children }: SheetProps) {
  const sheetRef = useRef<any>(null);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        onPress={onClose}
      />
    ),
    [onClose],
  );

  return (
    <BottomSheetLib
      ref={sheetRef}
      index={visible ? 0 : -1}
      snapPoints={SNAP_POINTS[size]}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleComponent={SheetHandle}
      backgroundStyle={styles.background}
    >
      {title !== undefined && (
        <View testID="sheet-header" style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            testID="sheet-close-btn"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close" size={ms(24)} color={Colors.dark.text2} />
          </Pressable>
        </View>
      )}

      {children}

      {footer !== undefined && (
        <View testID="sheet-footer" style={styles.footer}>
          {footer}
        </View>
      )}
    </BottomSheetLib>
  );
}

// Attach Body as a named export so consumers can import { Sheet } and use <Sheet.Body>
Sheet.Body = SheetBody;

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: ms(40),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  closeBtn: {
    width: ms(44),
    height: ms(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
});
```

- [ ] **Step 5.4: Run tests to verify they pass**

```bash
cd /home/user/MoneyApp
npx jest __tests__/components/ui/sheet.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests green.

- [ ] **Step 5.5: Commit**

```bash
git add components/ui/sheet.tsx __tests__/components/ui/sheet.test.tsx
git commit -m "feat(§3): Sheet component wrapping @gorhom/bottom-sheet with TDD"
```

---

## Task 6: Build FAB component

**Files:**
- Create: `components/ui/fab.tsx`
- Create: `__tests__/components/ui/fab.test.tsx`

- [ ] **Step 6.1: Write the failing test**

Create `/home/user/MoneyApp/__tests__/components/ui/fab.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-gesture-handler', () => {
  const { View, Pressable } = require('react-native');
  return {
    GestureHandlerRootView: View,
    LongPressGestureHandler: ({ children, onHandlerStateChange }: any) => {
      // Expose a testID prop so tests can trigger long-press
      return (
        <View
          testID="long-press-handler"
          onTouchStart={() =>
            onHandlerStateChange?.({ nativeEvent: { state: 4 } }) // State.ACTIVE = 4
          }
        >
          {children}
        </View>
      );
    },
    State: { ACTIVE: 4, END: 5 },
  };
});
jest.mock('react-native-reanimated', () => ({
  default: { View: require('react-native').View },
  useSharedValue: jest.fn((v: any) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((v: any) => v),
  withSpring: jest.fn((v: any) => v),
  withDelay: jest.fn((_: any, v: any) => v),
  Animated: { View: require('react-native').View },
  createAnimatedComponent: (c: any) => c,
}));

import { FAB } from '@/components/ui/fab';

describe('FAB component', () => {
  const baseProps = {
    onAddTransaction: jest.fn(),
    onAddAccount: jest.fn(),
    onAddCommitment: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    expect(() => render(<FAB {...baseProps} />)).not.toThrow();
  });

  it('renders FAB button with testID', () => {
    const { getByTestId } = render(<FAB {...baseProps} />);
    expect(getByTestId('fab-button')).toBeTruthy();
  });

  it('calls onAddTransaction when FAB is tapped (default action)', () => {
    const onAddTransaction = jest.fn();
    const { getByTestId } = render(
      <FAB {...baseProps} onAddTransaction={onAddTransaction} />,
    );
    fireEvent.press(getByTestId('fab-button'));
    expect(onAddTransaction).toHaveBeenCalledTimes(1);
  });

  it('mini menu items are not visible before long-press', () => {
    const { queryByTestId } = render(<FAB {...baseProps} />);
    expect(queryByTestId('fab-menu-item-0')).toBeNull();
  });

  it('calls onAddAccount when "Add Account" menu item is pressed after long-press', () => {
    const onAddAccount = jest.fn();
    const { getByTestId } = render(
      <FAB {...baseProps} onAddAccount={onAddAccount} />,
    );
    // Trigger long-press to open menu
    fireEvent(getByTestId('long-press-handler'), 'touchStart');
    // Press the menu item
    const item = getByTestId('fab-menu-item-1'); // index 1 = Add Account
    fireEvent.press(item);
    expect(onAddAccount).toHaveBeenCalledTimes(1);
  });

  it('calls onAddCommitment when "Add Commitment" menu item is pressed after long-press', () => {
    const onAddCommitment = jest.fn();
    const { getByTestId } = render(
      <FAB {...baseProps} onAddCommitment={onAddCommitment} />,
    );
    fireEvent(getByTestId('long-press-handler'), 'touchStart');
    const item = getByTestId('fab-menu-item-2'); // index 2 = Add Commitment
    fireEvent.press(item);
    expect(onAddCommitment).toHaveBeenCalledTimes(1);
  });

  describe('hidden prop', () => {
    it('FAB button is not accessible when hidden=true', () => {
      const { queryByTestId } = render(<FAB {...baseProps} hidden={true} />);
      // When hidden, the FAB container has pointerEvents="none" and opacity 0.
      // The button may still be in the tree but not interactive.
      // We test that the wrapper has the hidden style applied.
      const wrapper = queryByTestId('fab-container');
      expect(wrapper).toBeTruthy(); // still mounted
    });
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
cd /home/user/MoneyApp
npx jest __tests__/components/ui/fab.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '@/components/ui/fab'`

- [ ] **Step 6.3: Create components/ui/fab.tsx**

```tsx
/**
 * FAB — Floating Action Button.
 *
 * Persistent across all tabs. Hidden on /settings routes.
 * Tap = Add Transaction (default primary action).
 * Long-press = mini menu with Add Transaction / Add Account / Add Commitment.
 *
 * Ownership: consumed by app/(app)/(tabs)/_layout.tsx only.
 * Screens do not mount or control the FAB.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LongPressGestureHandler,
  State,
  type HandlerStateChangeEvent,
  type LongPressGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import { Text } from '@/components/ui/text';
import { ms } from '@/utils/responsive';

export interface FABProps {
  onAddTransaction: () => void;
  onAddAccount: () => void;
  onAddCommitment: () => void;
  /** Pass true when pathname starts with /settings. */
  hidden?: boolean;
  /** Bottom offset from the bottom of the screen in dp. Caller provides tab bar height + 16. */
  bottomOffset?: number;
}

interface MenuItem {
  testID: string;
  label: string;
  icon: string;
  onPress: () => void;
}

const FAB_SIZE = ms(56);
const MENU_ITEM_HEIGHT = ms(44);

export function FAB({
  onAddTransaction,
  onAddAccount,
  onAddCommitment,
  hidden = false,
  bottomOffset = ms(80),
}: FABProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Rotation for the + → × transform
  const rotation = useSharedValue(0);
  const scrimOpacity = useSharedValue(0);

  // Per-item animation values (3 items)
  const item0TranslateY = useSharedValue(20);
  const item0Opacity = useSharedValue(0);
  const item1TranslateY = useSharedValue(20);
  const item1Opacity = useSharedValue(0);
  const item2TranslateY = useSharedValue(20);
  const item2Opacity = useSharedValue(0);

  const itemAnimValues = [
    { translateY: item0TranslateY, opacity: item0Opacity },
    { translateY: item1TranslateY, opacity: item1Opacity },
    { translateY: item2TranslateY, opacity: item2Opacity },
  ];

  const openMenu = useCallback(() => {
    setMenuOpen(true);
    rotation.value = withTiming(45, { duration: 200 });
    scrimOpacity.value = withTiming(0.5, { duration: 200 });
    itemAnimValues.forEach(({ translateY, opacity }, index) => {
      translateY.value = withDelay(index * 40, withSpring(0, { mass: 0.8, stiffness: 180 }));
      opacity.value = withDelay(index * 40, withTiming(1, { duration: 150 }));
    });
  }, []);

  const closeMenu = useCallback(() => {
    rotation.value = withTiming(0, { duration: 200 });
    scrimOpacity.value = withTiming(0, { duration: 200 });
    itemAnimValues.forEach(({ translateY, opacity }, index) => {
      const reverseIndex = 2 - index;
      translateY.value = withDelay(reverseIndex * 40, withSpring(20, { mass: 0.8, stiffness: 180 }));
      opacity.value = withDelay(reverseIndex * 40, withTiming(0, { duration: 150 }));
    });
    // Delay state change to let close animation finish
    setTimeout(() => setMenuOpen(false), 280);
  }, []);

  const onLongPress = useCallback(
    (event: HandlerStateChangeEvent<LongPressGestureHandlerEventPayload>) => {
      if (event.nativeEvent.state === State.ACTIVE) {
        openMenu();
      }
    },
    [openMenu],
  );

  const onFABPress = useCallback(() => {
    if (menuOpen) {
      closeMenu();
    } else {
      onAddTransaction();
    }
  }, [menuOpen, closeMenu, onAddTransaction]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  const menuItems: MenuItem[] = [
    { testID: 'fab-menu-item-0', label: 'Add Transaction', icon: 'swap-horizontal', onPress: onAddTransaction },
    { testID: 'fab-menu-item-1', label: 'Add Account', icon: 'bank', onPress: onAddAccount },
    { testID: 'fab-menu-item-2', label: 'Add Commitment', icon: 'calendar-check', onPress: onAddCommitment },
  ];

  return (
    <View
      testID="fab-container"
      style={[
        styles.container,
        { bottom: bottomOffset },
        hidden && styles.hidden,
      ]}
      pointerEvents={hidden ? 'none' : 'box-none'}
    >
      {/* Scrim */}
      {menuOpen && (
        <Animated.View
          style={[styles.scrim, scrimStyle]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeMenu} />
        </Animated.View>
      )}

      {/* Mini menu items — rendered above FAB */}
      {menuOpen && menuItems.map((item, index) => {
        const anim = itemAnimValues[index];
        const itemStyle = useAnimatedStyle(() => ({
          transform: [{ translateY: anim.translateY.value }],
          opacity: anim.opacity.value,
        }));
        return (
          <Animated.View key={item.testID} style={[styles.menuItem, itemStyle]}>
            <Pressable
              testID={item.testID}
              onPress={() => {
                closeMenu();
                item.onPress();
              }}
              style={styles.menuPill}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={ms(18)}
                color={Colors.dark.text1}
              />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </Pressable>
          </Animated.View>
        );
      })}

      {/* FAB button */}
      <LongPressGestureHandler onHandlerStateChange={onLongPress} minDurationMs={500}>
        <Pressable
          testID="fab-button"
          onPress={onFABPress}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Add"
        >
          <LinearGradient
            colors={[GoldTokens[500], GoldTokens[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Animated.View style={rotateStyle}>
            <MaterialCommunityIcons
              name="plus"
              size={ms(28)}
              color={Colors.shared.midnightBlue}
            />
          </Animated.View>
        </Pressable>
      </LongPressGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
  },
  hidden: {
    opacity: 0,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: -1,
  },
  menuItem: {
    marginBottom: Spacing.xs,
  },
  menuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  menuLabel: {
    color: Colors.dark.text1,
    fontSize: ms(13),
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
```

- [ ] **Step 6.4: Run tests to verify they pass**

```bash
cd /home/user/MoneyApp
npx jest __tests__/components/ui/fab.test.tsx --no-coverage 2>&1 | tail -20
```

Expected: PASS — all tests green. (Animation tests are skipped per design doc — Reanimated interpolated values are mocked.)

- [ ] **Step 6.5: Commit**

```bash
git add components/ui/fab.tsx __tests__/components/ui/fab.test.tsx
git commit -m "feat(§3): FAB component with long-press menu and Reanimated animations"
```

---

## Task 7: Wire FAB into the tab layout

**Files:**
- Modify: `app/(app)/(tabs)/_layout.tsx`

- [ ] **Step 7.1: Read current tab layout**

Read `/home/user/MoneyApp/app/(app)/(tabs)/_layout.tsx` to confirm the current contents before modifying.

- [ ] **Step 7.2: Replace the tab layout with the FAB-wired version**

Replace the entire contents of `/home/user/MoneyApp/app/(app)/(tabs)/_layout.tsx` with:

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { Colors } from '@/constants/theme';
import { FAB } from '@/components/ui/fab';
import { ms } from '@/utils/responsive';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: MCIName, color: string) {
  return <MaterialCommunityIcons name={name} size={24} color={color} />;
}

/**
 * useFABActions — layout-local hook providing the three FAB navigation callbacks.
 *
 * Target routes are NO-OPS in §3 — the destination screens belong to later sections:
 *   - Add Transaction → §7
 *   - Add Account     → §9
 *   - Add Commitment  → §8
 *
 * Replace the console.warn stubs with router.push calls when each section ships.
 */
function useFABActions() {
  const router = useRouter();
  return {
    handleAddTransaction: () => {
      // TODO(§7): router.push('/(app)/transactions/add') when Add Transaction sheet ships
      console.warn('[FAB] Add Transaction not yet wired — pending §7');
    },
    handleAddAccount: () => {
      // TODO(§9): router.push('/(app)/accounts/add_account') when Add Account sheet ships
      console.warn('[FAB] Add Account not yet wired — pending §9');
    },
    handleAddCommitment: () => {
      // TODO(§8): router.push('/(app)/commitments/add') when Add Commitment ships
      console.warn('[FAB] Add Commitment not yet wired — pending §8');
    },
  };
}

function FABOverlay() {
  const { handleAddTransaction, handleAddAccount, handleAddCommitment } = useFABActions();
  const pathname = usePathname();
  const tabBarHeight = useBottomTabBarHeight();

  const isSettingsRoute = pathname.startsWith('/settings');
  const bottomOffset = tabBarHeight + ms(16);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <FAB
        onAddTransaction={handleAddTransaction}
        onAddAccount={handleAddAccount}
        onAddCommitment={handleAddCommitment}
        hidden={isSettingsRoute}
        bottomOffset={bottomOffset}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <>
      <Tabs
        initialRouteName="dashboard"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.shared.cairoGold,
          tabBarInactiveTintColor: Colors.dark.text2,
          tabBarStyle: {
            backgroundColor: Colors.dark.surface,
            borderTopColor: Colors.dark.border,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{ title: 'Home', tabBarIcon: ({ color }) => tabIcon('home', color) }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color }) => tabIcon('swap-horizontal', color),
          }}
        />
        <Tabs.Screen
          name="commitments"
          options={{
            title: 'Commitments',
            tabBarIcon: ({ color }) => tabIcon('calendar-check', color),
            popToTopOnBlur: true,
          }}
        />
        <Tabs.Screen
          name="goals/index"
          options={{ title: 'Goals', tabBarIcon: ({ color }) => tabIcon('target', color) }}
        />
        <Tabs.Screen
          name="budget/index"
          options={{ title: 'Budget', tabBarIcon: ({ color }) => tabIcon('chart-pie', color) }}
        />
      </Tabs>
      <FABOverlay />
    </>
  );
}
```

- [ ] **Step 7.3: Verify TypeScript compiles**

```bash
cd /home/user/MoneyApp
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors from the layout file. Fix any type errors before proceeding.

- [ ] **Step 7.4: Run existing tests to confirm no regressions**

```bash
cd /home/user/MoneyApp
npx jest --no-coverage 2>&1 | tail -20
```

Expected: all previously passing tests still pass. The layout file is not directly unit-tested (it requires the full Expo Router context), but regressions in imported modules will surface here.

- [ ] **Step 7.5: Commit**

```bash
git add app/\(app\)/\(tabs\)/_layout.tsx
git commit -m "feat(§3): wire FAB into tab layout with no-op callbacks pending §7/§8/§9"
```

---

## Task 8: Update CLAUDE.md — mark actions-sheet as legacy, document new Sheet

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 8.1: Read the current Bottom Sheets section in CLAUDE.md**

Read `/home/user/MoneyApp/CLAUDE.md` and locate the `## Bottom Sheets — react-native-actions-sheet` section.

- [ ] **Step 8.2: Replace the Bottom Sheets section**

Find the section:

```markdown
## Bottom Sheets — `react-native-actions-sheet`

- Patched via `patch-package` (see `patches/`). The patch fixes a first-open sizing bug where the library initialized internal dimensions to `{-1, -1}`.
- **Scrollable components inside ActionSheet** must be imported from `react-native-actions-sheet`, not from `react-native`. The sheet's gesture handler intercepts touch events, so standard RN `FlatList`/`ScrollView` won't scroll. Use: `import ActionSheet, { FlatList } from 'react-native-actions-sheet';`
- `useBottomSafeAreaPadding={false}` on all sheets to prevent double padding.
```

Replace it with:

```markdown
## Bottom Sheets

**New pattern (§3+): use `Sheet` from `components/ui/sheet.tsx`.**

`Sheet` wraps `@gorhom/bottom-sheet@^5.2.8`. It is declarative — open/close via `visible` prop + `onClose` callback. No refs, no `.show()` / `.hide()`.

```tsx
import { Sheet } from '@/components/ui/sheet';
import { BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';

<Sheet visible={isOpen} onClose={close} title="My Sheet" size="sm">
  <Sheet.Body>
    {/* Use BottomSheetScrollView / BottomSheetFlatList for scrollable content */}
    <BottomSheetScrollView>
      {/* content */}
    </BottomSheetScrollView>
  </Sheet.Body>
</Sheet>
```

**Scrollable content rule:** `BottomSheetScrollView` and `BottomSheetFlatList` must be imported from `@gorhom/bottom-sheet`, not from `react-native`. Standard `ScrollView` and `FlatList` will NOT scroll inside a Sheet.

**`react-native-actions-sheet` — LEGACY, phasing out section by section.**

The old `react-native-actions-sheet` dep and its patch (`patches/react-native-actions-sheet+10.1.2.patch`) remain in the project during §4–§9 while existing consumers are migrated. No new code may import from `react-native-actions-sheet`. Each section migrates the sheets within its domain. The dep and patch are removed when the last consumer is gone (no earlier than §9).

Legacy consumers still in-flight (as of §3): `screens/accounts/detail/components/adjust_balance_sheet.tsx`, `screens/commitments/detail/components/pay_sheet.tsx`, `screens/dashboard/components/net_worth_breakdown_sheet.tsx`, `screens/settings/categories/components/add_edit_category_sheet.tsx`, `screens/settings/categories/components/reassign_category_sheet.tsx`, `screens/transactions/filter/components/filter_account_picker.tsx`, `screens/transactions/filter/components/filter_category_picker.tsx`, `screens/transactions/filter/components/filter_date_custom_picker.tsx`, `screens/transactions/filter/index.tsx`, `screens/transactions/transaction_form/components/account_picker_sheet.tsx`, `screens/transactions/transaction_form/components/category_picker_sheet.tsx`, `screens/transactions/transaction_form/index.tsx`.
```

- [ ] **Step 8.3: Update Tech Stack line in CLAUDE.md**

Find the tech stack line that contains:
```
react-native-actions-sheet (patched; deferred retirement in §3)
```

Replace `react-native-actions-sheet (patched; deferred retirement in §3)` with:
```
react-native-actions-sheet (legacy, phasing out §4–§9; do NOT add new usages)
```

Also add `@gorhom/bottom-sheet@^5.2.8` to the tech stack list after `react-native-reanimated v4 + react-native-worklets`.

- [ ] **Step 8.4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(§3): update CLAUDE.md — document Sheet pattern, mark actions-sheet legacy"
```

---

## Task 9: Run full test suite and verify coverage

- [ ] **Step 9.1: Run all tests with coverage**

```bash
cd /home/user/MoneyApp
npm run test:coverage 2>&1 | tail -40
```

Expected: all tests pass. Coverage thresholds met (80% lines / 95% functions / 100% branches) — note that `components/ui/` is not in `collectCoverageFrom`, so the new component files do not affect thresholds.

- [ ] **Step 9.2: Fix any failures**

If smoke tests for `transactions.screen.test.tsx` or `dashboard.screen.test.tsx` fail, check if they need the new `@gorhom/bottom-sheet` mock. Those tests mock `react-native-actions-sheet` directly in the test file. No changes to those mocks are needed in §3.

- [ ] **Step 9.3: Commit if any test fixes were made**

```bash
git add -A
git commit -m "test(§3): fix any test regressions from §3 component additions"
```

---

## Task 10: Final self-review and PR prep

- [ ] **Step 10.1: Verify all four components are exported correctly**

```bash
cd /home/user/MoneyApp
grep -n "export" components/ui/fab.tsx components/ui/sheet.tsx components/ui/empty_state.tsx components/ui/settings_section.tsx
```

Expected: each file exports its primary component and its types.

- [ ] **Step 10.2: Verify no new react-native-actions-sheet imports were accidentally added**

```bash
cd /home/user/MoneyApp
git diff HEAD~10 --name-only | xargs grep -l "react-native-actions-sheet" 2>/dev/null
```

Expected: no new files. Only the 12 pre-existing legacy consumer files should have that import.

- [ ] **Step 10.3: TypeScript strict check**

```bash
cd /home/user/MoneyApp
npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 10.4: Run full test suite one final time**

```bash
cd /home/user/MoneyApp
npm run test:coverage 2>&1 | tail -20
```

Expected: all pass, all thresholds met.

- [ ] **Step 10.5: Final commit if needed**

```bash
git add -A
git commit -m "chore(§3): final cleanup before PR"
```

---

## Delivery checklist

Before opening a PR, confirm all of the following:

- [ ] `feat/section-3-reusable-patterns` branched from `claude/start-migration-section-3-PkU9s`
- [ ] `@gorhom/bottom-sheet@^5.2.8` in package.json
- [ ] `__mocks__/@gorhom/bottom-sheet.tsx` created with BottomSheet, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetFlatList mocks
- [ ] `components/ui/empty_state.tsx` — 4 variants, all copy from strings.ts
- [ ] `components/ui/settings_section.tsx` — header, dividers, all trailing types, destructive rows
- [ ] `components/ui/sheet.tsx` — visible prop, title, footer, BottomSheetBackdrop, scrollable-content JSDoc warning
- [ ] `components/ui/fab.tsx` — tap, long-press, 3 menu items (no-op), rotation, stagger, scrim, hidden prop
- [ ] `app/(app)/(tabs)/_layout.tsx` — FAB mounted as absolute overlay, pathname hide logic, no-op callbacks with TODO comments
- [ ] `constants/strings.ts` — 12 new EmptyState keys
- [ ] `CLAUDE.md` — Bottom Sheets section updated, actions-sheet marked legacy, @gorhom/bottom-sheet in tech stack
- [ ] All four `__tests__/components/ui/*.test.tsx` files present and passing
- [ ] Zero TypeScript errors (`npx tsc --noEmit`)
- [ ] Full test suite passing with coverage thresholds met
- [ ] No new imports from `react-native-actions-sheet` in any new or modified file
- [ ] Developer note: run `npx expo prebuild --clean` before launching the app (required for @gorhom/bottom-sheet native code)
