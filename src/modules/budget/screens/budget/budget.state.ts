import { batch, type ReadonlySignal, useSignal } from '@preact/signals-react';
import { useCallback } from 'react';

export type BudgetSheetMode = 'add' | 'edit';
export type LensTab = 'categories' | 'fiftythirty';

type BudgetStateShape = {
  sheetVisible: ReadonlySignal<boolean>;
  mode: ReadonlySignal<BudgetSheetMode>;
  targetCategoryId: ReadonlySignal<string | undefined>;
  lensTab: ReadonlySignal<LensTab>;
};

type BudgetStateActions = {
  openAdd: () => void;
  openEdit: (categoryId: string) => void;
  close: () => void;
  setLensTab: (tab: LensTab) => void;
  reset: () => void;
};

export type BudgetStateSetup = { state: BudgetStateShape } & BudgetStateActions;

export function useBudgetState(): BudgetStateSetup {
  const sheetVisible = useSignal(false);
  const mode = useSignal<BudgetSheetMode>('add');
  const targetCategoryId = useSignal<string | undefined>(undefined);
  const lensTab = useSignal<LensTab>('categories');

  const openAdd = useCallback(() => {
    batch(() => {
      sheetVisible.value = true;
      mode.value = 'add';
      targetCategoryId.value = undefined;
    });
  }, [mode, sheetVisible, targetCategoryId]);

  const openEdit = useCallback(
    (categoryId: string) => {
      batch(() => {
        sheetVisible.value = true;
        mode.value = 'edit';
        targetCategoryId.value = categoryId;
      });
    },
    [mode, sheetVisible, targetCategoryId],
  );

  const close = useCallback(() => {
    sheetVisible.value = false;
  }, [sheetVisible]);

  const setLensTab = useCallback(
    (tab: LensTab) => {
      lensTab.value = tab;
    },
    [lensTab],
  );

  const reset = useCallback(() => {
    batch(() => {
      sheetVisible.value = false;
      mode.value = 'add';
      targetCategoryId.value = undefined;
      lensTab.value = 'categories';
    });
  }, [lensTab, mode, sheetVisible, targetCategoryId]);

  return {
    state: {
      sheetVisible,
      mode,
      targetCategoryId,
      lensTab,
    },
    openAdd,
    openEdit,
    close,
    setLensTab,
    reset,
  };
}
