export interface SheetCloseLifecycle {
  hasOpened: boolean;
  isOpen: boolean;
  completed: boolean;
}

export interface SheetCloseSettlement {
  lifecycle: SheetCloseLifecycle;
  shouldComplete: boolean;
}

export function createSheetCloseLifecycle(isOpen: boolean): SheetCloseLifecycle {
  return { hasOpened: isOpen, isOpen, completed: false };
}

export function syncSheetCloseLifecycle(
  lifecycle: SheetCloseLifecycle,
  isOpen: boolean,
): SheetCloseLifecycle {
  if (isOpen) return { hasOpened: true, isOpen: true, completed: false };
  return { ...lifecycle, isOpen: false };
}

export function settleSheetCloseLifecycle(
  lifecycle: SheetCloseLifecycle,
  index: number,
): SheetCloseSettlement {
  const shouldComplete =
    index === -1 && lifecycle.hasOpened && !lifecycle.isOpen && !lifecycle.completed;
  return {
    lifecycle: shouldComplete ? { hasOpened: false, isOpen: false, completed: true } : lifecycle,
    shouldComplete,
  };
}
