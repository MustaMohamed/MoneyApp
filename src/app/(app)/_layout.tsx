import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useInit } from '@/utils/use_init.hook';

export default function AppLayout() {
  const loadCategories = useCategoryStore.getState().loadCategories;
  const { loadRate, fetchRate } = useCurrencyStore();

  useInit(() => {
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
