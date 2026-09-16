import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shouldHideGlobalFab } from '@/components/ui/fab_visibility';
import { holdToastClearance } from '@/components/ui/toast_clearance.state';
import { resolveTabsGeometry } from '@/modules/navigation/screens/tabs/tabs.helpers';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { useAnySheetOpen } from '@/store/sheet_visibility.store';

export function useTabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const anySheetOpen = useAnySheetOpen();
  const transactionFormVisible = useTransactionFormState(
    (state) => state.phase === 'open' || state.phase === 'closing',
  );

  const { fabBottomOffset, toastClearance } = resolveTabsGeometry(insets.bottom);

  // Blur fires before the (app) Stack freezes this subtree, so the clearance drops on leaving the tabs.
  useFocusEffect(useCallback(() => holdToastClearance(toastClearance), [toastClearance]));

  const handleAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);
  const handleAddCommitment = useCallback(() => router.push('/commitments/add'), [router]);

  return {
    state: {
      fabHidden: transactionFormVisible || shouldHideGlobalFab(pathname, anySheetOpen),
      fabBottomOffset,
    },
    handleAddTransaction: useTransactionFormState.getState().openAdd,
    handleAddAccount,
    handleAddCommitment,
  };
}
