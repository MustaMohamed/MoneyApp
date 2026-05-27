import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';

export default function AppLayout() {
  const loadAccounts = useAccountStore.use.loadAccounts();
  const loadCategories = useCategoryStore.use.loadCategories();
  const loadRate = useCurrencyStore.use.loadRate();
  const fetchRate = useCurrencyStore.use.fetchRate();

  useEffect(() => {
    loadAccounts().catch(() => {});
    loadCategories().catch(() => {});
    loadRate()
      .then(() => fetchRate())
      .catch(() => {});
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount; all deps are stable Zustand store actions

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.dark.bg } }}
    />
  );
}
