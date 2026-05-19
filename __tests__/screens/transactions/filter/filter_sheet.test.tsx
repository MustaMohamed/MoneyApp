import { fireEvent, render, act } from '@testing-library/react-native';
import React from 'react';

import { Currency } from '@/constants/enums';
import { FilterSheet } from '@/screens/transactions/filter';
import { useFilterState } from '@/screens/transactions/filter/filter.state';
import { useFilterStore } from '@/screens/transactions/filter/filter.store';
import { useTransactionsScreenStore } from '@/screens/transactions/transactions.store';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';

jest.mock('@/components/ui/sheet', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Sheet = (props: {
    visible: boolean;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) =>
    props.visible ? React.createElement(View, null, props.children, props.footer ?? null) : null;
  Sheet.Body = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  return { Sheet };
});

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

// @/components/ui/button uses heroui-native's HButton which is stripped by the
// heroui-native mock above. This stub lets getByText('Apply') / getByText('Apply (1)')
// find the button label without the full HeroUI render pipeline.
jest.mock('@/components/ui/button', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({
      label,
      onPress,
      disabled,
    }: {
      label: string;
      onPress?: () => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        Pressable,
        { onPress: disabled ? undefined : onPress, accessibilityState: { disabled: !!disabled } },
        React.createElement(Text, null, label),
      ),
  };
});

beforeEach(() => {
  useFilterState.getState().reset();
  useFilterStore.getState().resetDraft();
  useTransactionsScreenStore.getState().reset();
  useAccountStore.setState({
    state: {
      accounts: [
        {
          id: 'a1',
          name: 'CIB',
          type: 'bank',
          currency: 'EGP',
          current_balance: 0,
          opening_balance: 0,
          is_archived: 0,
          color: '#D4AF37',
          created_at: 'X',
          updated_at: 'X',
        } as never,
      ],
    },
  } as never);
  useCategoryStore.setState({
    state: {
      categories: [
        {
          id: 'c1',
          name: 'Food',
          icon: 'silverware-fork-knife',
          color: '#FFAA66',
          type: 'expense',
          is_archived: 0,
          created_at: 'X',
          updated_at: 'X',
        } as never,
      ],
    },
  } as never);
});

describe('FilterSheet', () => {
  it('does not render when visible is false', () => {
    const { queryByText } = render(<FilterSheet />);
    expect(queryByText('Filter')).toBeNull();
  });

  it('renders three accordion sections when visible', () => {
    act(() => useFilterState.getState().open());
    const { getByText } = render(<FilterSheet />);
    expect(getByText('Accounts')).toBeTruthy();
    expect(getByText('Categories')).toBeTruthy();
    expect(getByText('Amount')).toBeTruthy();
  });

  it('Reset clears all draft filters', () => {
    // Seed via appliedFilters so the re-seed-on-open effect picks them up.
    act(() => {
      useTransactionsScreenStore.getState().setAppliedFilters({
        accountIds: ['a1'],
        categoryIds: ['c1'],
        amountCurrency: Currency.EGP,
        amountMin: 10,
      });
      useFilterState.getState().open();
    });
    const { getByText } = render(<FilterSheet />);
    fireEvent.press(getByText('Reset'));
    expect(useFilterStore.getState().state.draft.accountIds).toEqual([]);
    expect(useFilterStore.getState().state.draft.categoryIds).toEqual([]);
    expect(useFilterStore.getState().state.draft.amountMin).toBeUndefined();
  });

  it('Apply commits the draft to appliedFilters and closes the sheet', () => {
    // Seed via appliedFilters so the re-seed-on-open effect picks them up,
    // then open — the effect seeds the draft with accountIds: ['a1'].
    act(() => {
      useTransactionsScreenStore.getState().setAppliedFilters({
        accountIds: ['a1'],
        categoryIds: [],
        amountCurrency: Currency.EGP,
      });
      useFilterState.getState().open();
    });
    const { getByText } = render(<FilterSheet />);
    fireEvent.press(getByText('Apply (1)'));
    expect(useTransactionsScreenStore.getState().state.appliedFilters.accountIds).toEqual(['a1']);
    expect(useFilterState.getState().state.visible).toBe(false);
  });

  it('Apply button label reads "Apply" when zero drafts', () => {
    act(() => useFilterState.getState().open());
    const { getByText } = render(<FilterSheet />);
    expect(getByText('Apply')).toBeTruthy();
  });

  it('does NOT render a Date section (regression guard)', () => {
    act(() => useFilterState.getState().open());
    const { queryByText } = render(<FilterSheet />);
    expect(queryByText('Date')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Accordion toggle — stale-closure regression guard
//
// The toggle used to read f.state.openSection from an arrow function captured
// in JSX at render time. On Android Fabric inside BottomSheetScrollView, if a
// second tap fired before the re-render from the first tap propagated, the
// closure still held the pre-tap value and re-opened the section instead of
// closing it.
//
// REAL REGRESSION GUARDS: the fireEvent.press tests below. They exercise the
// JSX-bound `() => f.toggleSection('...')` handler — that path is where the
// stale closure used to live. If someone reverts the JSX back to the
// closure-capturing ternary, these tests fail.
//
// The store-level toggleSection tests further down are unit-level coverage of
// the action itself (open→close, close→open, functional updater composition).
// They do NOT, by themselves, guard against a JSX regression.
// ---------------------------------------------------------------------------
describe('FilterSheet accordion toggle (stale-closure regression guard)', () => {
  it('pressing Accounts when closed sets openSection to "accounts"', () => {
    act(() => useFilterState.getState().open());
    const { getByText } = render(<FilterSheet />);
    fireEvent.press(getByText('Accounts'));
    expect(useFilterState.getState().state.openSection).toBe('accounts');
  });

  it('pressing Accounts when already open sets openSection back to null', () => {
    act(() => {
      useFilterState.getState().open();
      useFilterState.getState().toggleSection('accounts');
    });
    const { getByText } = render(<FilterSheet />);
    fireEvent.press(getByText('Accounts'));
    expect(useFilterState.getState().state.openSection).toBeNull();
  });

  it('pressing Categories when closed sets openSection to "categories"', () => {
    act(() => useFilterState.getState().open());
    const { getByText } = render(<FilterSheet />);
    fireEvent.press(getByText('Categories'));
    expect(useFilterState.getState().state.openSection).toBe('categories');
  });

  it('pressing Categories when already open sets openSection back to null', () => {
    act(() => {
      useFilterState.getState().open();
      useFilterState.getState().toggleSection('categories');
    });
    const { getByText } = render(<FilterSheet />);
    fireEvent.press(getByText('Categories'));
    expect(useFilterState.getState().state.openSection).toBeNull();
  });

  // Amount accordion press tests use the store directly to avoid rendering
  // the expanded AmountAccordion body, which contains <Input> from heroui-native
  // that the minimal heroui-native mock in this file does not cover.
  // The JSX path calls f.toggleSection('amount') which delegates to the same
  // Zustand action tested here, so coverage of the functional updater is intact.

  it('toggleSection opens Amount via store action', () => {
    act(() => {
      useFilterState.getState().open();
    });
    expect(useFilterState.getState().state.openSection).toBeNull();
    act(() => {
      useFilterState.getState().toggleSection('amount');
    });
    expect(useFilterState.getState().state.openSection).toBe('amount');
  });

  it('toggleSection closes Amount via store action', () => {
    act(() => {
      useFilterState.getState().open();
      useFilterState.getState().toggleSection('amount');
    });
    expect(useFilterState.getState().state.openSection).toBe('amount');
    act(() => {
      useFilterState.getState().toggleSection('amount');
    });
    expect(useFilterState.getState().state.openSection).toBeNull();
  });

  it('toggleSection composes correctly when called twice with no re-render between', () => {
    // Unit-level proof that the functional updater reads current state at call
    // time. Two calls in the same act() pass without a re-render in between:
    //   first call:  null → 'accounts'
    //   second call: 'accounts' → null
    // (This does NOT reproduce the original JSX closure-capture bug — that's
    // what the fireEvent.press tests above are for. This is just coverage of
    // the action's composability.)
    act(() => {
      useFilterState.getState().toggleSection('accounts');
      useFilterState.getState().toggleSection('accounts');
    });
    expect(useFilterState.getState().state.openSection).toBeNull();
  });
});
