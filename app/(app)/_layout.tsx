import { useEffect } from 'react';
import { Stack } from 'expo-router';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useTransactionStore } from '@/store/transaction.store';

export default function AppLayout() {
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const loadRate = useCurrencyStore((s) => s.loadRate);
  const fetchRate = useCurrencyStore((s) => s.fetchRate);
  const setTransactionQuery = useTransactionStore((s) => s.setQuery);

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
