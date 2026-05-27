import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface PaySheetStateShape {
  visible: boolean;
  saving: boolean;
  accountPickerVisible: boolean;
  rateOverride: boolean;
}

interface PaySheetState {
  state: PaySheetStateShape;
  setVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: PaySheetStateShape = {
  visible: false,
  saving: false,
  accountPickerVisible: false,
  rateOverride: false,
};

export const usePaySheetState = createMoneyAppSelectors(
  create<PaySheetState>((set) => ({
    state: INITIAL_STATE,
    setVisible: (v) => set((s) => ({ state: { ...s.state, visible: v } })),
    setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
    setAccountPickerVisible: (v) =>
      set((s) => ({ state: { ...s.state, accountPickerVisible: v } })),
    setRateOverride: (v) => set((s) => ({ state: { ...s.state, rateOverride: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
