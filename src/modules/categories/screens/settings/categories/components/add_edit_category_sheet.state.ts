import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { batch, type ReadonlySignal, useSignal } from '@preact/signals-react';
import type React from 'react';
import { useCallback } from 'react';

import { CategoryType } from '@/constants/enums';
import { AccountColors } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type AddEditCategorySheetSignalState = {
  type: ReadonlySignal<CategoryType>;
  selectedIcon: ReadonlySignal<IconName | null>;
  selectedColor: ReadonlySignal<string>;
  iconError: ReadonlySignal<string>;
  isLoading: ReadonlySignal<boolean>;
};

type AddEditCategorySheetActions = {
  setType: (t: CategoryType) => void;
  setSelectedIcon: (icon: IconName | null) => void;
  setSelectedColor: (c: string) => void;
  setIconError: (msg: string) => void;
  setIsLoading: (v: boolean) => void;
  initialize: (params: { type: CategoryType; icon: IconName | null; color: string }) => void;
  reset: () => void;
};

export function useAddEditCategorySheetState(): {
  state: AddEditCategorySheetSignalState;
} & AddEditCategorySheetActions {
  const type = useSignal(CategoryType.Expense);
  const selectedIcon = useSignal<IconName | null>(null);
  const selectedColor = useSignal<string>(AccountColors[0]);
  const iconError = useSignal('');
  const isLoading = useSignal(false);

  const setType = useCallback(
    (t: CategoryType) => {
      type.value = t;
    },
    [type],
  );
  const setSelectedIcon = useCallback(
    (icon: IconName | null) => {
      selectedIcon.value = icon;
    },
    [selectedIcon],
  );
  const setSelectedColor = useCallback(
    (c: string) => {
      selectedColor.value = c;
    },
    [selectedColor],
  );
  const setIconError = useCallback(
    (msg: string) => {
      iconError.value = msg;
    },
    [iconError],
  );
  const setIsLoading = useCallback(
    (v: boolean) => {
      isLoading.value = v;
    },
    [isLoading],
  );
  const initialize = useCallback(
    ({
      type: nextType,
      icon,
      color,
    }: {
      type: CategoryType;
      icon: IconName | null;
      color: string;
    }) => {
      batch(() => {
        type.value = nextType;
        selectedIcon.value = icon;
        selectedColor.value = color;
        iconError.value = '';
        isLoading.value = false;
      });
    },
    [iconError, isLoading, selectedColor, selectedIcon, type],
  );
  const reset = useCallback(() => {
    batch(() => {
      type.value = CategoryType.Expense;
      selectedIcon.value = null;
      selectedColor.value = AccountColors[0];
      iconError.value = '';
      isLoading.value = false;
    });
  }, [iconError, isLoading, selectedColor, selectedIcon, type]);

  return {
    state: { type, selectedIcon, selectedColor, iconError, isLoading },
    setType,
    setSelectedIcon,
    setSelectedColor,
    setIconError,
    setIsLoading,
    initialize,
    reset,
  };
}
