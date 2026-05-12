import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useReadyState } from './ready.state';
import { computeTotalBalance } from './ready.helpers';
import { Strings } from '@/constants/strings';

type SummaryRow = { label: string; value: string; gold: boolean };

export function useReadyV2() {
  const { state: onboardingState, completeOnboarding } = useOnboardingStore(
    useShallow((s) => ({ state: s.state, completeOnboarding: s.completeOnboarding })),
  );
  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: readyState, setCompleting } = useReadyState(
    useShallow((s) => ({ state: s.state, setCompleting: s.setCompleting })),
  );

  const total = computeTotalBalance(accountState.accounts);
  const formattedTotal = new Intl.NumberFormat('en-US').format(total);

  // 3-row summary — Security row is dropped (spec §2.6)
  const rows: SummaryRow[] = [
    {
      label: Strings.o6Currency,
      value: onboardingState.baseCurrency,
      gold: true,
    },
    {
      label: Strings.o6Accounts,
      value: `${accountState.accounts.length} ${Strings.o6AccountsUnit}`,
      gold: false,
    },
    {
      label: Strings.o6TotalBalance,
      value: `${formattedTotal} ${onboardingState.baseCurrency}`,
      gold: true,
    },
  ];

  const handleComplete = async () => {
    if (readyState.completing) return;
    setCompleting(true);
    try {
      await completeOnboarding();
    } finally {
      setCompleting(false);
    }
  };

  return {
    state: { rows, completing: readyState.completing },
    handleComplete,
  };
}
