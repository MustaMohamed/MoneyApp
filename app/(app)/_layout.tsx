import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore } from '@/store/transaction.store';

export default function AppLayout() {
  const { loadAccounts } = useAccountStore(useShallow((s) => ({ loadAccounts: s.loadAccounts })));
  const { loadCategories } = useCategoryStore(
    useShallow((s) => ({ loadCategories: s.loadCategories })),
  );
  const { loadRate, fetchRate } = useCurrencyStore(
    useShallow((s) => ({ loadRate: s.loadRate, fetchRate: s.fetchRate })),
  );
  const { setQuery: setTransactionQuery } = useTransactionStore(
    useShallow((s) => ({ setQuery: s.setQuery })),
  );

  useEffect(() => {
    loadAccounts().catch(() => {});
    loadCategories().catch(() => {});
    setTransactionQuery({}).catch(() => {});
    loadRate()
      .then(() => fetchRate())
      .catch(() => {});
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
