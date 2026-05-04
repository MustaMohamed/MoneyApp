import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useReadyState } from './ready.state';
import { Strings } from '@/constants/strings';
import { computeTotalBalance, resolveSecurityLabel } from './ready.helpers';

type SummaryRow = { label: string; value: string; gold: boolean };

export function useReady() {
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const securityChoice = useOnboardingStore((s) => s.securityChoice);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const accounts = useAccountStore((s) => s.accounts);
  const completing = useReadyState((s) => s.state.completing);
  const setCompleting = useReadyState((s) => s.setCompleting);

  const total = computeTotalBalance(accounts);
  const formattedTotal = new Intl.NumberFormat('en-US').format(total);
  const securityValue = resolveSecurityLabel(securityChoice);

  const rows: SummaryRow[] = [
    { label: Strings.o6Currency, value: baseCurrency, gold: true },
    {
      label: Strings.o6Accounts,
      value: `${accounts.length} ${Strings.o6AccountsUnit}`,
      gold: false,
    },
    { label: Strings.o6TotalBalance, value: `${formattedTotal} ${baseCurrency}`, gold: true },
    { label: Strings.o6Security, value: securityValue, gold: false },
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
