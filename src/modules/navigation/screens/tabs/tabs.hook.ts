import { usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shouldHideGlobalFab } from '@/components/ui/fab_visibility';
import { Size } from '@/constants/theme';
import { useTransactionFormV2State } from '@/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2.state';
import { useAnySheetOpen } from '@/store/sheet_visibility.store';
import { ms } from '@/utils/responsive';

export function useTabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const anySheetOpen = useAnySheetOpen();
  const transactionFormVisible = useTransactionFormV2State(
    (state) => state.phase === 'open' || state.phase === 'closing',
  );

  const handleAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);
  const handleAddCommitment = useCallback(
    () => router.push('/commitments/add' as Parameters<typeof router.push>[0]),
    [router],
  );

  return {
    state: {
      fabHidden: transactionFormVisible || shouldHideGlobalFab(pathname, anySheetOpen),
      fabBottomOffset: insets.bottom + Size.tabBarHeight + ms(16),
    },
    handleAddTransaction: useTransactionFormV2State.getState().openAdd,
    handleAddAccount,
    handleAddCommitment,
  };
}
