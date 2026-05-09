import '@/utils/zod_config';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getDb, runMigrations } from '@/database/client';
import { loadOnboardingState } from '@/store/onboarding.store';
import { useReadyStore } from '@/store/ready.store';
import { useCommitmentStore } from '@/store/commitment.store';

export function useLayoutInit() {
  const { setReady } = useReadyStore(useShallow((s) => ({ setReady: s.setReady })));

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        await runMigrations(db);
        await loadOnboardingState();
        const commitmentStore = useCommitmentStore.getState();
        await commitmentStore.loadCommitments();
        await commitmentStore.generatePayments();
        await commitmentStore.checkAndDeactivateExpired();
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        await commitmentStore.loadPaymentsForMonth(currentMonth);
      } catch {
        // Surface splash and let app render in degraded state
      } finally {
        setReady(true);
      }
    })();
  }, [setReady]);
}
