import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';

import { computeTotalBalance } from './ready.helpers';
import { useReadyState } from './ready.state';

type SummaryRow = { label: string; value: string; gold: boolean };

export function useReady() {
  const baseCurrency = useOnboardingStore.useState.baseCurrency();
  const completeOnboarding = useOnboardingStore.getState().completeOnboarding;
  const accounts = useAccountStore.useState.accounts();
  const completing = useReadyState((s) => s.completing);
  const setCompleting = useReadyState((s) => s.setCompleting);

  const total = computeTotalBalance(accounts);
  const formattedTotal = new Intl.NumberFormat('en-US').format(total);

  // 3-row summary — Security row is dropped (spec §2.6)
  const rows: SummaryRow[] = [
    {
      label: Strings.o6Currency,
      value: baseCurrency,
      gold: true,
    },
    {
      label: Strings.o6Accounts,
      value: `${accounts.length} ${Strings.o6AccountsUnit}`,
      gold: false,
    },
    {
      label: Strings.o6TotalBalance,
      value: `${formattedTotal} ${baseCurrency}`,
      gold: true,
    },
  ];

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await completeOnboarding();
    } finally {
      setCompleting(false);
    }
  };

  return {
    state: { rows, completing },
    handleComplete,
  };
}
