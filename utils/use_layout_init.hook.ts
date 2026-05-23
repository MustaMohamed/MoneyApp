import '@/utils/zod_config';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { getDb, runMigrations } from '@/database/client';
import { useCommitmentStore } from '@/store/commitment.store';
import { loadOnboardingState } from '@/store/onboarding.store';
import { useReadyStore } from '@/store/ready.store';

export function useLayoutInit() {
  const { setReady } = useReadyStore(useShallow((s) => ({ setReady: s.setReady })));

  useEffect(() => {
    let onboardingComplete = false;

    void (async () => {
      try {
        const db = await getDb();
        await runMigrations(db);
        const onboarding = await loadOnboardingState();
        onboardingComplete = onboarding.complete;
        setReady(true);
      } catch (err) {
        console.warn('[layoutInit] startup failed, rendering in degraded state:', err);
        setReady(true);
        return;
      }

      // Splash gate must NOT await commitment IO. New commitment work goes
      // inside this microtask or behind useFocusEffect on the consumer screen.
      // See plan: docs/superpowers/plans/2026-05-10-pre-m2-hardening.md (Item 3).
      if (onboardingComplete) {
        queueMicrotask(() => {
          void (async () => {
            try {
              const store = useCommitmentStore.getState();
              await store.generatePayments();
              await store.checkAndDeactivateExpired();
            } catch (err) {
              console.warn('[layoutInit] commitment housekeeping failed:', err);
            }
          })().catch(() => {
            // Belt-and-suspenders: any rejection that escaped the inner try/catch
            // (e.g., a future edit moves work outside the try) is swallowed here
            // to avoid unhandledrejection at app startup.
          });
        });
      }
    })();
  }, [setReady]);
}
