import React from 'react';
import { render } from '@testing-library/react-native';

import TransactionDetailScreen from '@/screens/transactions/detail';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 't1' }),
  useNavigation: () => ({ addListener: () => () => {} }),
}));

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    View,
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
  };
});

// Mock V1 edit transaction sheet and its state/store to avoid
// react-native-actions-sheet → react-native-gesture-handler native chain.
jest.mock('@/screens/transactions/transaction_form', () => ({
  EditTransactionSheet: () => null,
}));

jest.mock('@/screens/transactions/transaction_form/edit_transaction.state', () => ({
  useEditTransactionState: Object.assign(
    jest.fn(() => ({ state: { visible: false } })),
    { getState: () => ({ state: { visible: false }, close: jest.fn() }) },
  ),
}));

jest.mock('@/screens/transactions/transaction_form/edit_transaction.store', () => ({
  useEditTransactionStore: Object.assign(
    jest.fn(() => ({ state: { editingTx: undefined } })),
    {
      getState: () => ({
        state: { editingTx: undefined },
        reset: jest.fn(),
        loadFromTx: jest.fn(),
      }),
    },
  ),
}));

// §7: V2 mocks mirror V1 so the flag-branch (newAddTransaction) doesn't reach
// the real V2 EditTransactionSheet, which pulls in @gorhom/bottom-sheet via
// the Sheet wrapper and trips the simplified reanimated mock. Mocks collapse
// to a single set at Task 27 cleanup.
jest.mock('@/screens/transactions/transaction_form_v2', () => ({
  EditTransactionSheet: () => null,
}));
jest.mock('@/screens/transactions/transaction_form_v2/edit_transaction.state', () => ({
  useEditTransactionState: Object.assign(
    jest.fn(() => ({ state: { visible: false } })),
    { getState: () => ({ state: { visible: false }, close: jest.fn() }) },
  ),
}));
jest.mock('@/screens/transactions/transaction_form_v2/edit_transaction.store', () => ({
  useEditTransactionStore: Object.assign(
    jest.fn(() => ({ state: { editingTx: undefined } })),
    {
      getState: () => ({
        state: { editingTx: undefined },
        reset: jest.fn(),
        loadFromTx: jest.fn(),
      }),
    },
  ),
}));

jest.mock('@/screens/transactions/detail/detail.hook', () => ({
  useTransactionDetail: () => ({
    state: { viewState: 'loading' },
    openDeleteConfirm: jest.fn(),
    closeDeleteConfirm: jest.fn(),
    confirmDelete: jest.fn(),
    reload: jest.fn(),
  }),
}));

describe('TransactionDetailScreen smoke', () => {
  it('mounts without throwing', () => {
    expect(() => render(<TransactionDetailScreen />)).not.toThrow();
  });
});
