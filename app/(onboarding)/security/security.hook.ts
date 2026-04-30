import { useRouter } from 'expo-router';
import { useSecurityStore } from './security.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { backOrReplace } from '@/utils/onboarding_nav';
import { OnboardingStep, SecurityChoice } from '@/constants/enums';
import { canProceed } from './security.helpers';

export function useSecurity() {
  const router = useRouter();
  const setStep = useOnboardingStore((s) => s.setStep);
  const setSecurityChoice = useOnboardingStore((s) => s.setSecurityChoice);
  const savedChoice = useOnboardingStore((s) => s.securityChoice);
  const storeSelected = useSecurityStore((s) => s.selected);
  const setSelected = useSecurityStore((s) => s.setSelected);

  // Fall back to globally saved choice on cold start / resume
  const selected: SecurityChoice | undefined = storeSelected ?? savedChoice;

  const onContinue = async () => {
    if (!canProceed(selected)) return;
    await setSecurityChoice(selected);
    await setStep(OnboardingStep.O4);
    router.push('/(onboarding)/add_account');
  };

  const onBack = () => backOrReplace(router, '/(onboarding)/currency');

  return { selected, setSelected, onContinue, onBack };
}
