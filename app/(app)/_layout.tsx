import { useEffect } from 'react';
import { Stack } from 'expo-router';

import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';

export default function AppLayout() {
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loadRate = useCurrencyStore((s) => s.loadRate);
  const fetchRate = useCurrencyStore((s) => s.fetchRate);

  useEffect(() => {
    loadAccounts();
    loadRate()
      .then(() => fetchRate())
      .catch(() => {});
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
