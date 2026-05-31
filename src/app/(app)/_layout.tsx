import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useInit } from '@/utils/use_init.hook';

export default function AppLayout() {
  const { init } = useAccountStore();
  const loadCategories = useCategoryStore.getState().loadCategories;
  const loadRate = useCurrencyStore.getState().loadRate;
  const fetchRate = useCurrencyStore.getState().fetchRate;

  useInit(() => {
    init().catch(() => {});
    loadCategories().catch(() => {});
    loadRate()
      .then(() => fetchRate())
      .catch(() => {});
  });

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.dark.bg } }}
    />
  );
}
