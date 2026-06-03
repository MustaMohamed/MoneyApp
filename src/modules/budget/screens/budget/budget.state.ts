import { batch, type Signal, signal } from '@preact/signals-react';

export type BudgetSheetMode = 'add' | 'edit';
export type LensTab = 'categories' | 'fiftythirty';

interface BudgetStateShape {
  sheetVisible: Signal<boolean>;
  mode: Signal<BudgetSheetMode>;
  targetCategoryId: Signal<string | undefined>;
  lensTab: Signal<LensTab>;
}

type BudgetStateActions = {
  openAdd: () => void;
  openEdit: (categoryId: string) => void;
  close: () => void;
  setLensTab: (tab: LensTab) => void;
  reset: () => void;
};

export type BudgetStateController = { state: BudgetStateShape } & BudgetStateActions;

const sheetVisible = signal(false);
const mode = signal<BudgetSheetMode>('add');
const targetCategoryId = signal<string | undefined>(undefined);
const lensTab = signal<LensTab>('categories');

const budgetState: BudgetStateController = {
  state: {
    sheetVisible,
    mode,
    targetCategoryId,
    lensTab,
  },
  openAdd: () => {
    batch(() => {
      sheetVisible.value = true;
      mode.value = 'add';
      targetCategoryId.value = undefined;
    });
  },
  openEdit: (categoryId) => {
    batch(() => {
      sheetVisible.value = true;
      mode.value = 'edit';
      targetCategoryId.value = categoryId;
    });
  },
  close: () => {
    sheetVisible.value = false;
  },
  setLensTab: (tab) => {
    lensTab.value = tab;
  },
  reset: () => {
    batch(() => {
      sheetVisible.value = false;
      mode.value = 'add';
      targetCategoryId.value = undefined;
      lensTab.value = 'categories';
    });
  },
};

export function useBudgetState(): BudgetStateController {
  return budgetState;
}
