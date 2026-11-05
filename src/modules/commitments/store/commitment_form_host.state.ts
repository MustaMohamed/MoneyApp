import { create } from 'zustand';

import {
  type CommitmentStopCounts,
  NO_STOP_COUNTS,
} from '@/modules/commitments/domain/payment_state';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import { NO_SETTLED_DUE_DATES } from '@/modules/commitments/screens/commitments/commitment_form.helpers';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.state';
import {
  isAnyEditCommitmentSaving,
  useEditCommitmentState,
} from '@/modules/commitments/screens/commitments/commitment_form/edit_commitment.state';
import {
  isAnyCommitmentStopBusy,
  useCommitmentStopState,
} from '@/modules/commitments/screens/commitments/commitment_stop.state';
import {
  type FormSessionHostSource,
  type FormSessionPhase,
  subscribeToAll,
} from '@/utils/use_form_session.hook';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

type CommitmentFormPhase = FormSessionPhase;

type CommitmentFormMode = 'add' | 'edit';

export type CommitmentFormCloseOutcome = 'added' | 'updated' | 'stopped';

interface CommitmentEditLanding {
  onSaved?: () => void;
  onStopped?: () => void;
}

export interface CommitmentFormFooterState {
  saving: boolean;
  errorMessage?: string;
  footnote?: string;
}

interface CommitmentFormHostStateShape {
  phase: CommitmentFormPhase;
  sessionId: number;
  mode: CommitmentFormMode | undefined;
  editingCommitment: Commitment | undefined;
  editingSettledDueDates: readonly string[];
  editingStopCounts: CommitmentStopCounts;
  landing: CommitmentEditLanding | undefined;
  footer: CommitmentFormFooterState;
  closeOutcome: CommitmentFormCloseOutcome | undefined;
}

type CommitmentFormHostState = CommitmentFormHostStateShape & {
  openAdd: () => void;
  openEdit: (
    commitment: Commitment,
    settledDueDates: readonly string[],
    landing: CommitmentEditLanding | undefined,
    stopCounts: CommitmentStopCounts,
  ) => void;
  requestClose: () => boolean;
  completeSave: (sessionId: number, closeOutcome?: CommitmentFormCloseOutcome) => boolean;
  completeClose: (sessionId: number) => CommitmentFormCloseOutcome | undefined;
  publishFooter: (sessionId: number, footer: CommitmentFormFooterState) => void;
  reset: () => void;
};

const INITIAL_FOOTER: CommitmentFormFooterState = { saving: false };

const INITIAL_STATE: CommitmentFormHostStateShape = {
  phase: 'closed',
  sessionId: 0,
  mode: undefined,
  editingCommitment: undefined,
  editingSettledDueDates: NO_SETTLED_DUE_DATES,
  editingStopCounts: NO_STOP_COUNTS,
  landing: undefined,
  footer: INITIAL_FOOTER,
  closeOutcome: undefined,
};

export function isCommitmentFormSessionSaving(mode: CommitmentFormMode | undefined): boolean {
  if (mode === 'add') return useAddCommitmentState.getState().saving;
  if (mode === 'edit') {
    return (
      isAnyEditCommitmentSaving(useEditCommitmentState.getState()) ||
      isAnyCommitmentStopBusy(useCommitmentStopState.getState())
    );
  }
  return false;
}

export const useCommitmentFormHostState = createMoneyAppSelectors(
  create<CommitmentFormHostState>((set, get) => ({
    ...INITIAL_STATE,

    openAdd: () => {
      if (get().phase !== 'closed') return;
      set((state) => ({
        phase: 'open',
        sessionId: state.sessionId + 1,
        mode: 'add',
        editingCommitment: undefined,
        editingSettledDueDates: NO_SETTLED_DUE_DATES,
        editingStopCounts: NO_STOP_COUNTS,
        landing: undefined,
        footer: INITIAL_FOOTER,
        closeOutcome: undefined,
      }));
    },

    openEdit: (commitment, settledDueDates, landing, stopCounts) => {
      if (get().phase !== 'closed') return;
      set((state) => ({
        phase: 'open',
        sessionId: state.sessionId + 1,
        mode: 'edit',
        editingCommitment: commitment,
        editingSettledDueDates: settledDueDates,
        editingStopCounts: stopCounts,
        landing,
        footer: INITIAL_FOOTER,
        closeOutcome: undefined,
      }));
    },

    requestClose: () => {
      const { phase, footer, mode } = get();
      if (phase !== 'open') return true;
      if (footer.saving || isCommitmentFormSessionSaving(mode)) return false;
      set({ phase: 'closing' });
      return true;
    },

    completeSave: (sessionId, closeOutcome) => {
      const state = get();
      if (state.phase !== 'open' || state.sessionId !== sessionId) return false;
      set({ phase: 'closing', closeOutcome });
      return true;
    },

    completeClose: (sessionId) => {
      const state = get();
      if (state.phase !== 'closing' || state.sessionId !== sessionId) return undefined;
      set({
        phase: 'closed',
        mode: undefined,
        editingCommitment: undefined,
        editingSettledDueDates: NO_SETTLED_DUE_DATES,
        editingStopCounts: NO_STOP_COUNTS,
        landing: undefined,
        footer: INITIAL_FOOTER,
        closeOutcome: undefined,
      });
      return state.closeOutcome;
    },

    publishFooter: (sessionId, footer) => {
      const state = get();
      if (state.sessionId === sessionId && state.phase !== 'closed') set({ footer });
    },

    reset: () => set(INITIAL_STATE),
  })),
);

export const COMMITMENT_FORM_SESSION_SOURCE: FormSessionHostSource = {
  read: () => {
    const { phase, sessionId, footer, mode } = useCommitmentFormHostState.getState();
    return { phase, sessionId, footer, sessionSaving: isCommitmentFormSessionSaving(mode) };
  },
  subscribe: subscribeToAll([
    useCommitmentFormHostState,
    useAddCommitmentState,
    useEditCommitmentState,
    useCommitmentStopState,
  ]),
  requestClose: () => useCommitmentFormHostState.getState().requestClose(),
};
