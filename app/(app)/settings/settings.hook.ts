import { useRouter } from 'expo-router';

export function useSettings() {
  const router = useRouter();

  const goToCurrency = () => router.push('/settings/currency');
  const goBack = () => router.back();

  return { goToCurrency, goBack };
}
