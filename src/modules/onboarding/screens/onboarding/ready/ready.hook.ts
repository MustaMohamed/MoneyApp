import { Strings } from '@/constants/strings';
import { EMPTY_ACCOUNTS, useAccountStore } from '@/modules/accounts/store/account.store';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useAsync } from '@/utils/use_async.hook';

import { computeTotalBalance } from './ready.helpers';

type SummaryRow = { label: string; value: string; gold: boolean };

export function useReady() {
  const { state: onboardingState, completeOnboarding } = useOnboardingStore();
  const complete = useAsync(completeOnboarding);
  const { state: accountsState } = useAccountStore();
  const accounts = accountsState.accounts.value ?? EMPTY_ACCOUNTS;
  const baseCurrency = onboardingState.baseCurrency.value;

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
    if (complete.isLoading.value) return;
    await complete();
  };

  return {
    state: { rows, completing: complete.isLoading },
    handleComplete,
  };
}
