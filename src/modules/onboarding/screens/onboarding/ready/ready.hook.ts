import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useOnboarding } from '@/modules/onboarding/store/onboarding.store';

import { computeTotalBalance } from './ready.helpers';
import { useReadyScreenState } from './ready.state';

type SummaryRow = { label: string; value: string; gold: boolean };

export function useReady() {
  const { state: onboardingState, completeOnboarding } = useOnboarding();
  const accounts = useAccountStore.useState.accounts();
  const { state: readyState, setCompleting } = useReadyScreenState();
  const baseCurrency = onboardingState.baseCurrency.value;
  const completing = readyState.completing.value;

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
