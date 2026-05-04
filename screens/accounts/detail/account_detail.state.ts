import { create } from 'zustand';

interface AccountDetailStateShape {
  isEditing: boolean;
  isAdjustVisible: boolean;
  isArchiveVisible: boolean;
  isSaving: boolean;
  isAdjusting: boolean;
  isArchiving: boolean;
}

interface AccountDetailState {
  state: AccountDetailStateShape;
  setEditing: (v: boolean) => void;
  setAdjustVisible: (v: boolean) => void;
  setArchiveVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAdjusting: (v: boolean) => void;
  setArchiving: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: AccountDetailStateShape = {
  isEditing: false,
  isAdjustVisible: false,
  isArchiveVisible: false,
  isSaving: false,
  isAdjusting: false,
  isArchiving: false,
};

export function createAccountDetailState() {
  return create<AccountDetailState>((set) => ({
    state: INITIAL_STATE,
    setEditing: (v) => set((s) => ({ state: { ...s.state, isEditing: v } })),
    setAdjustVisible: (v) => set((s) => ({ state: { ...s.state, isAdjustVisible: v } })),
    setArchiveVisible: (v) => set((s) => ({ state: { ...s.state, isArchiveVisible: v } })),
    setSaving: (v) => set((s) => ({ state: { ...s.state, isSaving: v } })),
    setAdjusting: (v) => set((s) => ({ state: { ...s.state, isAdjusting: v } })),
    setArchiving: (v) => set((s) => ({ state: { ...s.state, isArchiving: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  }));
}

export const useAccountDetailState = createAccountDetailState();
