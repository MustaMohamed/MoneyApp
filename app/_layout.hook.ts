import '@/utils/zod_config';
import { useEffect } from 'react';
import { getDb, runMigrations } from '@/database/client';
import { loadOnboardingState } from '@/store/onboarding.store';
import { useReadyStore } from '@/store/ready.store';

export function useLayoutInit() {
  const setReady = useReadyStore((s) => s.setReady);

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
