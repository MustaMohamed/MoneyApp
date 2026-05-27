import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';
import { create } from 'zustand';

import { CategoryType } from '@/constants/enums';
import { AccountColors } from '@/constants/theme';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface AddEditCategorySheetStateShape {
  type: CategoryType;
  selectedIcon: IconName | null;
  selectedColor: string;
  iconError: string;
  isLoading: boolean;
}

interface AddEditCategorySheetState {
  state: AddEditCategorySheetStateShape;
  setType: (t: CategoryType) => void;
  setSelectedIcon: (icon: IconName | null) => void;
  setSelectedColor: (c: string) => void;
  setIconError: (msg: string) => void;
  setIsLoading: (v: boolean) => void;
  initialize: (params: { type: CategoryType; icon: IconName | null; color: string }) => void;
  reset: () => void;
}

const INITIAL_STATE: AddEditCategorySheetStateShape = {
  type: CategoryType.Expense,
  selectedIcon: null,
  selectedColor: AccountColors[0],
  iconError: '',
  isLoading: false,
};

export const useAddEditCategorySheetState = createMoneyAppSelectors(
  create<AddEditCategorySheetState>((set) => ({
    state: INITIAL_STATE,
    setType: (t) => set((s) => ({ state: { ...s.state, type: t } })),
    setSelectedIcon: (icon) => set((s) => ({ state: { ...s.state, selectedIcon: icon } })),
    setSelectedColor: (c) => set((s) => ({ state: { ...s.state, selectedColor: c } })),
    setIconError: (msg) => set((s) => ({ state: { ...s.state, iconError: msg } })),
    setIsLoading: (v) => set((s) => ({ state: { ...s.state, isLoading: v } })),
    initialize: ({ type, icon, color }) =>
      set({
        state: {
          type,
          selectedIcon: icon,
          selectedColor: color,
          iconError: '',
          isLoading: false,
        },
      }),
    reset: () => set({ state: INITIAL_STATE }),
  })),
);
