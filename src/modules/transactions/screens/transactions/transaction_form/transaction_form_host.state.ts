import { create } from 'zustand';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import { useAddTransactionState } from './add_transaction.state';
import { useAddTransactionStore } from './add_transaction.store';
import { useEditTransactionState } from './edit_transaction.state';
import { useEditTransactionStore } from './edit_transaction.store';

export type TransactionFormMode = 'add' | 'edit';
export type TransactionFormPhase = 'closed' | 'preparing' | 'open' | 'closing';

interface TransactionFormHostStateShape {
  mode: TransactionFormMode | null;
  phase: TransactionFormPhase;
  sessionId: number;
  editingTx: Transaction | null;
  onEditSaved: (() => void) | undefined;
}

type TransactionFormHostState = TransactionFormHostStateShape & {
  openAdd: () => void;
  openEdit: (tx: Transaction, onSaved?: () => void) => void;
  present: (sessionId: number) => void;
  requestClose: () => boolean;
  completeSave: () => void;
  completeClose: (sessionId: number) => void;
  reset: () => void;
};

const INITIAL_STATE: TransactionFormHostStateShape = {
  mode: null,
  phase: 'closed',
  sessionId: 0,
  editingTx: null,
  onEditSaved: undefined,
};

function resetAddSession(): void {
  useAddTransactionStore.getState().reset();
  useAddTransactionState.getState().reset();
}

function resetEditSession(): void {
  useEditTransactionStore.getState().reset();
  useEditTransactionState.getState().reset();
}

export const useTransactionFormHostState = createMoneyAppSelectors(
  create<TransactionFormHostState>((set, get) => ({
    ...INITIAL_STATE,

    openAdd: () => {
      resetAddSession();
      set((state) => ({
        mode: 'add',
        phase: 'preparing',
        sessionId: state.sessionId + 1,
        editingTx: null,
        onEditSaved: undefined,
      }));
    },

    openEdit: (tx, onEditSaved) => {
      resetEditSession();
      useEditTransactionStore.getState().loadFromTx(tx);
      set((state) => ({
        mode: 'edit',
        phase: 'preparing',
        sessionId: state.sessionId + 1,
        editingTx: tx,
        onEditSaved,
      }));
    },

    present: (sessionId) => {
      const state = get();
      if (state.sessionId !== sessionId || state.phase !== 'preparing') return;
      set({ phase: 'open' });
    },

    requestClose: () => {
      const state = get();
      if (state.phase === 'closed' || state.phase === 'closing') return true;
      const saving =
        state.mode === 'add'
          ? useAddTransactionState.getState().saving
          : useEditTransactionState.getState().saving;
      if (saving) return false;

      if (state.phase === 'preparing') {
        if (state.mode === 'add') resetAddSession();
        if (state.mode === 'edit') resetEditSession();
        set((current) => ({
          ...INITIAL_STATE,
          sessionId: current.sessionId,
        }));
        return true;
      }

      set({ phase: 'closing' });
      return true;
    },

    completeSave: () => {
      const state = get();
      if (state.phase !== 'open') return;
      set({ phase: 'closing' });
    },

    completeClose: (sessionId) => {
      const state = get();
      if (state.sessionId !== sessionId || state.phase !== 'closing') return;
      if (state.mode === 'add') resetAddSession();
      if (state.mode === 'edit') resetEditSession();
      set((current) => ({
        ...INITIAL_STATE,
        sessionId: current.sessionId,
      }));
    },

    reset: () => {
      resetAddSession();
      resetEditSession();
      set(INITIAL_STATE);
    },
  })),
);
