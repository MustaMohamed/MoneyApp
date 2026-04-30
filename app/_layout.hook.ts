import '@/utils/zod_config';
import { useEffect } from 'react';
import { getDb, runMigrations } from '@/database/client';
import { loadOnboardingState } from '@/store/onboarding.store';
import { useLayoutStore } from './_layout.store';

export function useLayoutInit() {
  const setReady = useLayoutStore((s) => s.setReady);

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        await runMigrations(db);
        await loadOnboardingState();
      } catch {
        // Surface splash and let app render in degraded state
      } finally {
        setReady(true);
      }
    })();
  }, [setReady]);
}
