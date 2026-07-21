import { usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shouldHideGlobalFab } from '@/components/ui/fab_visibility';
import { Size } from '@/constants/theme';
import { useTransactionFormHostState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { useAnySheetOpen } from '@/store/sheet_visibility.store';
import { ms } from '@/utils/responsive';

export function useTabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const anySheetOpen = useAnySheetOpen();
  const transactionFormActive = useTransactionFormHostState((state) => state.phase !== 'closed');

  const handleAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);
  const handleAddCommitment = useCallback(
    () => router.push('/commitments/add' as Parameters<typeof router.push>[0]),
    [router],
  );

  return {
    state: {
      fabHidden: transactionFormActive || shouldHideGlobalFab(pathname, anySheetOpen),
      fabBottomOffset: insets.bottom + Size.tabBarHeight + ms(16),
    },
    handleAddTransaction: useTransactionFormHostState.getState().openAdd,
    handleAddAccount,
    handleAddCommitment,
  };
}
