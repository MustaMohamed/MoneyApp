import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useInit } from '@/utils/use_init.hook';

export default function AppLayout() {
  const categoryStore = useCategoryStore();
  const currencyStore = useCurrencyStore();

  useInit(() => {
    categoryStore.loadCategories().catch(() => {});
    currencyStore
      .loadRate()
      .then(() => currencyStore.fetchRate())
      .catch(() => {});
  });

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        contentStyle: { backgroundColor: Colors.dark.bg },
      }}
    />
  );
}
