import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';

import { Currency } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionsScreenStore } from '@/screens/transactions_v2/transactions.store';
import { useFilterState } from '@/screens/transactions_v2/filter/filter.state';
import { useFilterStore } from '@/screens/transactions_v2/filter/filter.store';

import { FilterSheet } from '@/screens/transactions_v2/filter';

jest.mock('@/components/ui/sheet', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Sheet = (props: { visible: boolean; children: React.ReactNode; footer?: React.ReactNode }) =>
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
    Button: ({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) =>
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
        { id: 'a1', name: 'CIB', type: 'bank', currency: 'EGP', current_balance: 0, opening_balance: 0, is_archived: 0, color: '#D4AF37', created_at: 'X', updated_at: 'X' } as never,
      ],
    },
  } as never);
  useCategoryStore.setState({
    state: {
      categories: [
        { id: 'c1', name: 'Food', icon: 'silverware-fork-knife', color: '#FFAA66', type: 'expense', is_archived: 0, created_at: 'X', updated_at: 'X' } as never,
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
    act(() => {
      useFilterStore.getState().setDraft({
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
    act(() => {
      useFilterStore.getState().setDraft({
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
