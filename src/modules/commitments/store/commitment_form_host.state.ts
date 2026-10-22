import { create } from 'zustand';

import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.state';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

type CommitmentFormPhase = 'closed' | 'open' | 'closing';

interface CommitmentFormHostStateShape {
  phase: CommitmentFormPhase;
  sessionId: number;
}

type CommitmentFormHostState = CommitmentFormHostStateShape & {
  openAdd: () => void;
  requestClose: () => boolean;
  completeSave: (sessionId: number) => boolean;
  completeClose: (sessionId: number) => void;
  reset: () => void;
};

const INITIAL_STATE: CommitmentFormHostStateShape = {
  phase: 'closed',
  sessionId: 0,
};

export const useCommitmentFormHostState = createMoneyAppSelectors(
  create<CommitmentFormHostState>((set, get) => ({
    ...INITIAL_STATE,

    openAdd: () => {
      if (get().phase !== 'closed') return;
      set((state) => ({ phase: 'open', sessionId: state.sessionId + 1 }));
    },

    requestClose: () => {
      const { phase } = get();
      if (phase !== 'open') return true;
      if (useAddCommitmentState.getState().saving) return false;
      set({ phase: 'closing' });
      return true;
    },

    completeSave: (sessionId) => {
      const state = get();
      if (state.phase !== 'open' || state.sessionId !== sessionId) return false;
      set({ phase: 'closing' });
      return true;
    },

    completeClose: (sessionId) => {
      const state = get();
      if (state.phase !== 'closing' || state.sessionId !== sessionId) return;
      set({ phase: 'closed' });
    },

    reset: () => set(INITIAL_STATE),
  })),
);
