import { useRef } from 'react';
import { create } from 'zustand';

interface MonthFilterStateShape {
  isPickerOpen: boolean;
  pickerYear: number;
  yearRowHeight: number | undefined;
}

type MonthFilterState = MonthFilterStateShape & {
  setPickerOpen: (v: boolean) => void;
  setPickerYear: (v: number) => void;
  shiftPickerYear: (delta: number) => void;
  setYearRowHeight: (height: number) => void;
};

function createStore(initialYear: number) {
  return create<MonthFilterState>((set) => ({
    isPickerOpen: false,
    pickerYear: initialYear,
    yearRowHeight: undefined,
    setPickerOpen: (v) => set({ isPickerOpen: v }),
    setPickerYear: (v) => set({ pickerYear: v }),
    shiftPickerYear: (delta) => set((s) => ({ pickerYear: s.pickerYear + delta })),
    setYearRowHeight: (height) => set({ yearRowHeight: height }),
  }));
}

type Store = ReturnType<typeof createStore>;

export function useMonthFilterState(initialYear: number) {
  const storeRef = useRef<Store | null>(null);
  storeRef.current ??= createStore(initialYear);

  const isPickerOpen = storeRef.current((s) => s.isPickerOpen);
  const pickerYear = storeRef.current((s) => s.pickerYear);
  const yearRowHeight = storeRef.current((s) => s.yearRowHeight);
  const setPickerOpen = storeRef.current((s) => s.setPickerOpen);
  const setPickerYear = storeRef.current((s) => s.setPickerYear);
  const shiftPickerYear = storeRef.current((s) => s.shiftPickerYear);
  const setYearRowHeight = storeRef.current((s) => s.setYearRowHeight);

  return {
    state: { isPickerOpen, pickerYear, yearRowHeight },
    setPickerOpen,
    setPickerYear,
    shiftPickerYear,
    setYearRowHeight,
  };
}
