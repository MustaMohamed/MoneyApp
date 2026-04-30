import '@/utils/zod_config';
import { useEffect } from 'react';
import { initDatabase } from '@/db/init';
import { loadOnboardingState } from '@/store/onboarding.store';
import { useLayoutStore } from './_layout.store';

export function useLayoutInit() {
  const setReady = useLayoutStore((s) => s.setReady);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await loadOnboardingState();
      } catch {
        // Surface splash and let app render in degraded state
      } finally {
        setReady(true);
      }
    })();
  }, [setReady]);
}
