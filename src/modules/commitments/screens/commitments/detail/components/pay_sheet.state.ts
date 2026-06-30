import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface PaySheetStateShape {
  visible: boolean;
  saving: boolean;
  accountPickerVisible: boolean;
  rateOverride: boolean;
}

type PaySheetState = PaySheetStateShape & {
  setVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAccountPickerVisible: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
};

const INITIAL_STATE: PaySheetStateShape = {
  visible: false,
  saving: false,
  accountPickerVisible: false,
  rateOverride: false,
};

export const usePaySheetState = createMoneyAppSelectors(
  create<PaySheetState>((set) => ({
    ...INITIAL_STATE,
    setVisible: (v) => set({ visible: v }),
    setSaving: (v) => set({ saving: v }),
    setAccountPickerVisible: (v) => set({ accountPickerVisible: v }),
    setRateOverride: (v) => set({ rateOverride: v }),
    reset: () => set(INITIAL_STATE),
  })),
);
