import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { TransactionFormHost } from '@/modules/transactions/screens/transactions/transaction_form';
import { useCategoryStore } from '@/store/category.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useInit } from '@/utils/use_init.hook';

export { RouteErrorFallback as ErrorBoundary } from '@/modules/navigation/components/route_error_fallback';

export default function AppLayout() {
  const loadCategories = useCategoryStore.getState().loadCategories;
  const refreshRateIfStale = useCurrencyStore.getState().refreshRateIfStale;

  useInit(() => {
    loadCategories().catch(() => {});
    refreshRateIfStale().catch(() => {});
  });

  return (
    // The host is a sibling of the Stack, not a screen of it, so `freezeOnBlur` never reaches it.
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true,
          contentStyle: { backgroundColor: Colors.dark.bg },
        }}
      />
      <TransactionFormHost />
    </>
  );
}
