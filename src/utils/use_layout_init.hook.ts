import '@/utils/zod_config';
import { getDb, runMigrations } from '@/database/client';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { useCommitmentStore } from '@/store/commitment.store';
import { useAppReadyStore } from '@/store/ready.store';
import { useInit } from '@/utils/use_init.hook';

export function useAppInit() {
  const {
    state: { ready },
    markReady,
    reset,
  } = useAppReadyStore();
  const { init: initAccounts } = useAccountStore();
  const { init: initOnboarding } = useOnboardingStore();

  useInit(() => {
    let onboardingComplete = false;

    return (async () => {
      try {
        const db = await getDb();
        await runMigrations(db);
        const [onboarding] = await Promise.all([initOnboarding(), initAccounts()]);
        onboardingComplete = onboarding.complete;
        markReady();
      } catch (err) {
        console.warn('[layoutInit] startup failed, rendering in degraded state:', err);
        markReady();
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
  });

  return {
    state: { ready },
    reset,
    markReady,
  } as const;
}

export const useLayoutInit = useAppInit;
