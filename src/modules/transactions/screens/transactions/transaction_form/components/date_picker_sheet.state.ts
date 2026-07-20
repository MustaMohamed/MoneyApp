import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface DatePickerSheetStateShape {
  activeOwnerId: string | undefined;
  isOpen: boolean;
  showAndroidPicker: boolean;
  initialDate: string;
  draftDate: string;
}

type DatePickerSheetState = DatePickerSheetStateShape & {
  openIos: (ownerId: string, date: string) => void;
  openAndroid: (ownerId: string, date: string) => void;
  setDraftDate: (ownerId: string, date: string) => void;
  closeIos: (ownerId: string) => void;
  closeAndroid: (ownerId: string) => void;
  release: (ownerId: string) => void;
  reset: () => void;
};

const INITIAL_STATE: DatePickerSheetStateShape = {
  activeOwnerId: undefined,
  isOpen: false,
  showAndroidPicker: false,
  initialDate: '',
  draftDate: '',
};

export const useDatePickerSheetState = createMoneyAppSelectors(
  create<DatePickerSheetState>((set) => ({
    ...INITIAL_STATE,

    openIos: (activeOwnerId, date) =>
      set({
        activeOwnerId,
        isOpen: true,
        showAndroidPicker: false,
        initialDate: date,
        draftDate: date,
      }),
    openAndroid: (activeOwnerId, date) =>
      set({
        activeOwnerId,
        isOpen: false,
        showAndroidPicker: true,
        initialDate: date,
        draftDate: date,
      }),
    setDraftDate: (ownerId, draftDate) =>
      set((state) => (state.activeOwnerId === ownerId ? { draftDate } : {})),
    closeIos: (ownerId) =>
      set((state) =>
        state.activeOwnerId === ownerId
          ? {
              activeOwnerId: undefined,
              isOpen: false,
              draftDate: state.initialDate,
            }
          : {},
      ),
    closeAndroid: (ownerId) =>
      set((state) =>
        state.activeOwnerId === ownerId
          ? { activeOwnerId: undefined, showAndroidPicker: false }
          : {},
      ),
    release: (ownerId) => set((state) => (state.activeOwnerId === ownerId ? INITIAL_STATE : {})),
    reset: () => set(INITIAL_STATE),
  })),
);
