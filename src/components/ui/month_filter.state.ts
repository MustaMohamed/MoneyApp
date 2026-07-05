import { useRef } from 'react';
import { create } from 'zustand';

interface MonthFilterStateShape {
  isPickerOpen: boolean;
  pickerYear: number;
}

type MonthFilterState = MonthFilterStateShape & {
  setPickerOpen: (v: boolean) => void;
  setPickerYear: (v: number) => void;
  shiftPickerYear: (delta: number) => void;
};

function createStore(initialYear: number) {
  return create<MonthFilterState>((set) => ({
    isPickerOpen: false,
    pickerYear: initialYear,
    setPickerOpen: (v) => set({ isPickerOpen: v }),
    setPickerYear: (v) => set({ pickerYear: v }),
    shiftPickerYear: (delta) => set((s) => ({ pickerYear: s.pickerYear + delta })),
  }));
}

type Store = ReturnType<typeof createStore>;

export function useMonthFilterState(initialYear: number) {
  const storeRef = useRef<Store | null>(null);
  storeRef.current ??= createStore(initialYear);

  const isPickerOpen = storeRef.current((s) => s.isPickerOpen);
  const pickerYear = storeRef.current((s) => s.pickerYear);
  const setPickerOpen = storeRef.current((s) => s.setPickerOpen);
  const setPickerYear = storeRef.current((s) => s.setPickerYear);
  const shiftPickerYear = storeRef.current((s) => s.shiftPickerYear);

  return {
    state: { isPickerOpen, pickerYear },
    setPickerOpen,
    setPickerYear,
    shiftPickerYear,
  };
}
