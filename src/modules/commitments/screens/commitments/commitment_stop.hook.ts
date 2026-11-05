import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { useCommitmentStore } from '../../store/commitment.store';
import { INITIAL_STOP_ENTRY, useCommitmentStopState } from './commitment_stop.state';

/** The Stop write the detail and the edit sheet share; `onStopped` runs once the write lands. */
export function useCommitmentStop(
  ownerId: string,
  commitmentId: string | undefined,
  onStopped: () => void,
) {
  const entry = useCommitmentStopState((s) => s.entries[ownerId] ?? INITIAL_STOP_ENTRY);
  const onStoppedRef = useRef(onStopped);
  useLayoutEffect(() => {
    onStoppedRef.current = onStopped;
  });

  const actions = useMemo(() => {
    const store = useCommitmentStopState.getState();
    return {
      openStopDialog: () => store.open(ownerId),
      cancelStop: () => store.cancel(ownerId),
      stopCommitment: async (): Promise<void> => {
        if (commitmentId === undefined) return;
        // Read off the store: two taps in one frame both see the render's `busy` as false.
        if (useCommitmentStopState.getState().entries[ownerId]?.busy === true) return;
        store.begin(ownerId);
        try {
          await useCommitmentStore.getState().deactivateCommitment(commitmentId);
        } catch (error) {
          console.error('[commitmentStop] stopCommitment failed', error);
          store.fail(ownerId);
          return;
        }
        // A copy released mid-stop must not move whatever screen is on top now; the write stands.
        if (!(ownerId in useCommitmentStopState.getState().entries)) return;
        store.succeed(ownerId);
        try {
          onStoppedRef.current();
        } catch (error) {
          console.error('[commitmentStop] step after the stop failed', error);
        }
      },
    };
  }, [ownerId, commitmentId]);

  useEffect(() => () => useCommitmentStopState.getState().release(ownerId), [ownerId]);

  return { state: { isOpen: entry.isOpen, busy: entry.busy, failed: entry.failed }, ...actions };
}
