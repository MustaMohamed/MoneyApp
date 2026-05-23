import { create } from 'zustand';

interface PaySheetStateShape {
  visible: boolean;
  saving: boolean;
  accountPickerVisible: boolean;
}

interface PaySheetState {
  state: PaySheetStateShape;
  setVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: PaySheetStateShape = {
  visible: false,
  saving: false,
  accountPickerVisible: false,
};

export const usePaySheetState = create<PaySheetState>((set) => ({
  state: INITIAL_STATE,
  setVisible: (v) => set((s) => ({ state: { ...s.state, visible: v } })),
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  setAccountPickerVisible: (v) => set((s) => ({ state: { ...s.state, accountPickerVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
