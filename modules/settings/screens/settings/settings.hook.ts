import { useRouter } from 'expo-router';

export function useSettings() {
  const router = useRouter();

  const goToCurrency = () => router.push('/settings/currency');
  const goToCategories = () => router.push('/settings/categories');
  const goToAbout = () => router.push('/settings/about');
  const goBack = () => router.back();

  return { goToCurrency, goToCategories, goToAbout, goBack };
}
