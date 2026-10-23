import { create } from 'zustand';

import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.state';
import {
  isAnyEditCommitmentSaving,
  useEditCommitmentState,
} from '@/modules/commitments/screens/commitments/commitment_form/edit_commitment.state';
import {
  type FormSessionHostSource,
  type FormSessionPhase,
  subscribeToAll,
} from '@/utils/use_form_session.hook';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

type CommitmentFormPhase = FormSessionPhase;

type CommitmentFormMode = 'add' | 'edit';

export interface CommitmentEditLanding {
  onSaved?: () => void;
  onDeactivated?: () => void;
}

export interface CommitmentFormFooterState {
  saving: boolean;
  errorMessage?: string;
}

interface CommitmentFormHostStateShape {
  phase: CommitmentFormPhase;
  sessionId: number;
  mode: CommitmentFormMode | undefined;
  editingCommitmentId: string | undefined;
  landing: CommitmentEditLanding | undefined;
  footer: CommitmentFormFooterState;
}

type CommitmentFormHostState = CommitmentFormHostStateShape & {
  openAdd: () => void;
  openEdit: (commitmentId: string, landing?: CommitmentEditLanding) => void;
  requestClose: () => boolean;
  completeSave: (sessionId: number) => boolean;
  completeClose: (sessionId: number) => void;
  publishFooter: (sessionId: number, footer: CommitmentFormFooterState) => void;
  reset: () => void;
};

const INITIAL_FOOTER: CommitmentFormFooterState = { saving: false };

const INITIAL_STATE: CommitmentFormHostStateShape = {
  phase: 'closed',
  sessionId: 0,
  mode: undefined,
  editingCommitmentId: undefined,
  landing: undefined,
  footer: INITIAL_FOOTER,
};

export function isCommitmentFormSessionSaving(mode: CommitmentFormMode | undefined): boolean {
  if (mode === 'add') return useAddCommitmentState.getState().saving;
  if (mode === 'edit') return isAnyEditCommitmentSaving(useEditCommitmentState.getState());
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
        editingCommitmentId: undefined,
        landing: undefined,
        footer: INITIAL_FOOTER,
      }));
    },

    openEdit: (commitmentId, landing) => {
      if (get().phase !== 'closed') return;
      set((state) => ({
        phase: 'open',
        sessionId: state.sessionId + 1,
        mode: 'edit',
        editingCommitmentId: commitmentId,
        landing,
        footer: INITIAL_FOOTER,
      }));
    },

    requestClose: () => {
      const { phase, footer, mode } = get();
      if (phase !== 'open') return true;
      if (footer.saving || isCommitmentFormSessionSaving(mode)) return false;
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
      set({
        phase: 'closed',
        mode: undefined,
        editingCommitmentId: undefined,
        landing: undefined,
        footer: INITIAL_FOOTER,
      });
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
  ]),
  requestClose: () => useCommitmentFormHostState.getState().requestClose(),
};
