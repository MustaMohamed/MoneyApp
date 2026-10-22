import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shouldHideGlobalFab } from '@/components/ui/fab_visibility';
import { useAnySheetOpen } from '@/components/ui/sheet_visibility.state';
import { holdToastClearance } from '@/components/ui/toast_clearance.state';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import {
  resolveTabLabelStyle,
  resolveTabsGeometry,
} from '@/modules/navigation/screens/tabs/tabs.helpers';
import { useTransactionFormState } from '@/modules/transactions/store/transaction_form_host.state';

export function useTabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const anySheetOpen = useAnySheetOpen();
  const transactionFormVisible = useTransactionFormState(
    (state) => state.phase === 'open' || state.phase === 'closing',
  );
  const commitmentFormVisible = useCommitmentFormHostState(
    (state) => state.phase === 'open' || state.phase === 'closing',
  );

  const pathHidesAddButton = shouldHideGlobalFab(pathname, false);
  const { fabBottomOffset, toastClearance } = resolveTabsGeometry(
    insets.bottom,
    pathHidesAddButton,
  );

  // Blur fires before the (app) Stack freezes this subtree, so the clearance drops on leaving the tabs.
  useFocusEffect(useCallback(() => holdToastClearance(toastClearance), [toastClearance]));

  const handleAddAccount = useCallback(() => router.push('/accounts/add_account'), [router]);

  return {
    state: {
      fabHidden:
        transactionFormVisible || commitmentFormVisible || anySheetOpen || pathHidesAddButton,
      fabBottomOffset,
    },
    handleAddTransaction: useTransactionFormState.getState().openAdd,
    handleAddAccount,
    handleAddCommitment: useCommitmentFormHostState.getState().openAdd,
  };
}

export function useTabBarLabelStyle() {
  return resolveTabLabelStyle(useWindowDimensions().fontScale);
}
