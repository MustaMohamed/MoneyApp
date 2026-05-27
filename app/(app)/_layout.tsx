import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { Colors } from '@/constants/theme';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';

export default function AppLayout() {
  const { loadAccounts } = useAccountStore(useShallow((s) => ({ loadAccounts: s.loadAccounts })));
  const { loadCategories } = useCategoryStore(
    useShallow((s) => ({ loadCategories: s.loadCategories })),
  );
  const { loadRate, fetchRate } = useCurrencyStore(
    useShallow((s) => ({ loadRate: s.loadRate, fetchRate: s.fetchRate })),
  );

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
