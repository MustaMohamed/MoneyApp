import { create } from 'zustand';

interface AccountDetailState {
  isEditing: boolean;
  isAdjustVisible: boolean;
  isArchiveVisible: boolean;
  setEditing: (v: boolean) => void;
  setAdjustVisible: (v: boolean) => void;
  setArchiveVisible: (v: boolean) => void;
  reset: () => void;
}

export function createAccountDetailStore() {
  return create<AccountDetailState>((set) => ({
    isEditing: false,
    isAdjustVisible: false,
    isArchiveVisible: false,
    setEditing: (v) => set({ isEditing: v }),
    setAdjustVisible: (v) => set({ isAdjustVisible: v }),
    setArchiveVisible: (v) => set({ isArchiveVisible: v }),
    reset: () => set({ isEditing: false, isAdjustVisible: false, isArchiveVisible: false }),
  }));
}

export const useAccountDetailStore = createAccountDetailStore();
