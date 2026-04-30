import { useRouter } from 'expo-router'
import { useCurrencyStore } from './currency.store'
import { useOnboardingStore } from '@/store/onboarding_store'
import { backOrReplace } from '@/utils/onboarding_nav'
import type { Currency } from '@/store/onboarding_store'

export function useCurrency() {
  const router = useRouter()
  const setStep = useOnboardingStore((s) => s.setStep)
  const setBaseCurrency = useOnboardingStore((s) => s.setBaseCurrency)
  const globalBaseCurrency = useOnboardingStore((s) => s.baseCurrency)
  const storeSelected = useCurrencyStore((s) => s.selected)
  const setSelected = useCurrencyStore((s) => s.setSelected)

  // Fall back to global store value until the user makes a local selection
  const selected: Currency = storeSelected ?? globalBaseCurrency

  const onContinue = async () => {
    await setBaseCurrency(selected)
    await setStep('O3')
    router.push('/(onboarding)/security')
  }

  const onBack = () => backOrReplace(router, '/(onboarding)/welcome')

  return { selected, setSelected, onContinue, onBack }
}
