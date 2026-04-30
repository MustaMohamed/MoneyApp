import { useAccountStore } from '@/store/account_store';
import { useOnboardingStore } from '@/store/onboarding_store';
import { useReadyStore } from './ready.store';
import { Strings } from '@/constants/strings';

type SummaryRow = { label: string; value: string; gold: boolean };

export function useReady() {
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const securityChoice = useOnboardingStore((s) => s.securityChoice);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const accounts = useAccountStore((s) => s.accounts);
  const completing = useReadyStore((s) => s.completing);
  const setCompleting = useReadyStore((s) => s.setCompleting);

  const total = accounts.reduce((sum, a) => sum + a.opening_balance, 0);
  const formattedTotal = new Intl.NumberFormat('en-US').format(total);

  const securityValue =
    securityChoice === null || securityChoice === 'skip'
      ? Strings.o6SecuritySkipped
      : Strings.o6SecurityEnabled;

  const rows: SummaryRow[] = [
    { label: Strings.o6Currency, value: baseCurrency, gold: true },
    { label: Strings.o6Accounts, value: `${accounts.length} accounts`, gold: false },
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

  return { rows, completing, handleComplete };
}
