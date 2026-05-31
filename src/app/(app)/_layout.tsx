import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';

export default function AppLayout() {
  const { loadAccounts } = useAccountStore();
  const loadCategories = useCategoryStore.getState().loadCategories;
  const loadRate = useCurrencyStore.getState().loadRate;
  const fetchRate = useCurrencyStore.getState().fetchRate;

  useEffect(() => {
    loadAccounts().catch(() => {});
    loadCategories().catch(() => {});
    loadRate()
      .then(() => fetchRate())
      .catch(() => {});
  }, [fetchRate, loadAccounts, loadCategories, loadRate]);

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.dark.bg } }}
    />
  );
}
