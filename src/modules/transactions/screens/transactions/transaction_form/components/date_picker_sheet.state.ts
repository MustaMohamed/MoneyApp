import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface DatePickerSheetStateShape {
  isOpen: boolean;
  showAndroidPicker: boolean;
  initialDate: string;
  draftDate: string;
}

type DatePickerSheetState = DatePickerSheetStateShape & {
  openIos: (date: string) => void;
  openAndroid: (date: string) => void;
  setDraftDate: (date: string) => void;
  closeIos: () => void;
  closeAndroid: () => void;
  reset: () => void;
};

const INITIAL_STATE: DatePickerSheetStateShape = {
  isOpen: false,
  showAndroidPicker: false,
  initialDate: '',
  draftDate: '',
};

export const useDatePickerSheetState = createMoneyAppSelectors(
  create<DatePickerSheetState>((set) => ({
    ...INITIAL_STATE,

    openIos: (date) =>
      set({ isOpen: true, showAndroidPicker: false, initialDate: date, draftDate: date }),
    openAndroid: (date) =>
      set({ isOpen: false, showAndroidPicker: true, initialDate: date, draftDate: date }),
    setDraftDate: (draftDate) => set({ draftDate }),
    closeIos: () => set((state) => ({ isOpen: false, draftDate: state.initialDate })),
    closeAndroid: () => set({ showAndroidPicker: false }),
    reset: () => set(INITIAL_STATE),
  })),
);
