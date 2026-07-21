import { create } from 'zustand';

import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';
import type { TransactionFormPrerequisiteStatus } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_prerequisites.helpers';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { areTransactionFormV2PrerequisitesReady } from './transaction_form_v2_prerequisites.helpers';

export type TransactionFormV2Mode = 'add' | 'edit';
export type TransactionFormV2Phase = 'closed' | 'open' | 'closing';
export type TransactionFormV2PostCloseAction = 'addAccount';

export interface TransactionFormV2FooterState {
  visible: boolean;
  saving: boolean;
  disabled: boolean;
}

interface TransactionFormV2StateShape {
  mode: TransactionFormV2Mode | null;
  phase: TransactionFormV2Phase;
  sessionId: number;
  editingTx: Transaction | null;
  onEditSaved: (() => void) | undefined;
  postCloseAction: TransactionFormV2PostCloseAction | undefined;
  prerequisiteStatus: TransactionFormPrerequisiteStatus;
  prerequisiteGeneration: number;
  footer: TransactionFormV2FooterState;
}

type TransactionFormV2State = TransactionFormV2StateShape & {
  openAdd: () => void;
  openEdit: (tx: Transaction, onSaved?: () => void) => void;
  requestClose: () => boolean;
  requestAccountCreation: (sessionId: number) => boolean;
  completeSave: (sessionId: number) => boolean;
  completeClose: (sessionId: number) => TransactionFormV2PostCloseAction | undefined;
  beginPrerequisites: (sessionId: number, generation: number) => boolean;
  completePrerequisites: (sessionId: number, generation: number) => void;
  failPrerequisites: (sessionId: number, generation: number) => void;
  retryPrerequisites: () => void;
  publishFooter: (sessionId: number, footer: TransactionFormV2FooterState) => void;
  reset: () => void;
};

const CLOSED_FOOTER: TransactionFormV2FooterState = {
  visible: false,
  saving: false,
  disabled: true,
};

const LOADING_FOOTER: TransactionFormV2FooterState = {
  visible: true,
  saving: false,
  disabled: true,
};

const READY_FOOTER: TransactionFormV2FooterState = {
  visible: true,
  saving: false,
  disabled: false,
};

const INITIAL_STATE: TransactionFormV2StateShape = {
  mode: null,
  phase: 'closed',
  sessionId: 0,
  editingTx: null,
  onEditSaved: undefined,
  postCloseAction: undefined,
  prerequisiteStatus: 'idle',
  prerequisiteGeneration: 0,
  footer: CLOSED_FOOTER,
};

function resetFormSessions(): void {
  useAddTransactionStore.getState().reset();
  useAddTransactionState.getState().reset();
  useEditTransactionStore.getState().reset();
  useEditTransactionState.getState().reset();
}

function getOpeningState(mode: TransactionFormV2Mode, editingTx: Transaction | null) {
  const ready = areTransactionFormV2PrerequisitesReady(mode, editingTx);
  const hasAccounts = useAccountStore.getState().accounts.length > 0;
  return {
    prerequisiteStatus: ready ? ('ready' as const) : ('idle' as const),
    footer: ready
      ? mode === 'add' && !hasAccounts
        ? CLOSED_FOOTER
        : READY_FOOTER
      : LOADING_FOOTER,
  };
}

export function isTransactionFormSessionSaving(mode: TransactionFormV2Mode | null): boolean {
  if (mode === 'add') return useAddTransactionState.getState().saving;
  if (mode === 'edit') return useEditTransactionState.getState().saving;
  return false;
}

function isOwnedRequest(
  state: TransactionFormV2StateShape,
  sessionId: number,
  generation: number,
): boolean {
  return (
    state.phase === 'open' &&
    state.sessionId === sessionId &&
    state.prerequisiteGeneration === generation
  );
}

export const useTransactionFormV2State = createMoneyAppSelectors(
  create<TransactionFormV2State>((set, get) => ({
    ...INITIAL_STATE,

    openAdd: () => {
      resetFormSessions();
      const opening = getOpeningState('add', null);
      set((state) => ({
        mode: 'add',
        phase: 'open',
        sessionId: state.sessionId + 1,
        editingTx: null,
        onEditSaved: undefined,
        postCloseAction: undefined,
        prerequisiteStatus: opening.prerequisiteStatus,
        prerequisiteGeneration: 0,
        footer: opening.footer,
      }));
    },

    openEdit: (tx, onEditSaved) => {
      resetFormSessions();
      useEditTransactionStore.getState().loadFromTx(tx);
      const opening = getOpeningState('edit', tx);
      set((state) => ({
        mode: 'edit',
        phase: 'open',
        sessionId: state.sessionId + 1,
        editingTx: tx,
        onEditSaved,
        postCloseAction: undefined,
        prerequisiteStatus: opening.prerequisiteStatus,
        prerequisiteGeneration: 0,
        footer: opening.footer,
      }));
    },

    requestClose: () => {
      const state = get();
      if (state.phase === 'closed' || state.phase === 'closing') return true;
      if (state.footer.saving || isTransactionFormSessionSaving(state.mode)) return false;
      set({ phase: 'closing' });
      return true;
    },

    requestAccountCreation: (sessionId) => {
      const state = get();
      if (
        state.mode !== 'add' ||
        state.phase !== 'open' ||
        state.sessionId !== sessionId ||
        state.footer.saving ||
        isTransactionFormSessionSaving(state.mode)
      ) {
        return false;
      }
      set({ phase: 'closing', postCloseAction: 'addAccount' });
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
      if (state.sessionId !== sessionId || state.phase !== 'closing') return undefined;
      const postCloseAction = state.postCloseAction;
      resetFormSessions();
      set((current) => ({
        ...INITIAL_STATE,
        sessionId: current.sessionId,
      }));
      return postCloseAction;
    },

    beginPrerequisites: (sessionId, generation) => {
      const state = get();
      if (!isOwnedRequest(state, sessionId, generation) || state.prerequisiteStatus !== 'idle') {
        return false;
      }
      set({ prerequisiteStatus: 'loading' });
      return true;
    },

    completePrerequisites: (sessionId, generation) => {
      const state = get();
      if (isOwnedRequest(state, sessionId, generation) && state.prerequisiteStatus === 'loading') {
        set({ prerequisiteStatus: 'ready' });
      }
    },

    failPrerequisites: (sessionId, generation) => {
      const state = get();
      if (isOwnedRequest(state, sessionId, generation) && state.prerequisiteStatus === 'loading') {
        set({ prerequisiteStatus: 'error' });
      }
    },

    retryPrerequisites: () => {
      const state = get();
      if (state.phase !== 'open' || state.prerequisiteStatus === 'loading') return;
      set({
        prerequisiteGeneration: state.prerequisiteGeneration + 1,
        prerequisiteStatus: 'idle',
      });
    },

    publishFooter: (sessionId, footer) => {
      const state = get();
      if (state.sessionId === sessionId && state.phase !== 'closed') set({ footer });
    },

    reset: () => {
      resetFormSessions();
      set(INITIAL_STATE);
    },
  })),
);
