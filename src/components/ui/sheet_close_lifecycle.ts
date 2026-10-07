export interface SheetCloseLifecycle {
  hasOpened: boolean;
  isOpen: boolean;
  completed: boolean;
  /** An index of 0 or more has been reported since the sheet last opened, so a -1 that follows is this open's own. */
  openReported: boolean;
  /** The closed position was reported while `isOpen` still read true; the close completes when the flag drops. */
  restsClosed: boolean;
}

export interface SheetCloseSettlement {
  lifecycle: SheetCloseLifecycle;
  shouldComplete: boolean;
}

export function createSheetCloseLifecycle(isOpen: boolean): SheetCloseLifecycle {
  return { hasOpened: isOpen, isOpen, completed: false, openReported: false, restsClosed: false };
}

export function syncSheetCloseLifecycle(
  lifecycle: SheetCloseLifecycle,
  isOpen: boolean,
): SheetCloseLifecycle {
  if (!isOpen) return { ...lifecycle, isOpen: false };
  if (lifecycle.isOpen) return lifecycle;
  return createSheetCloseLifecycle(true);
}

function settleOpenSheet(lifecycle: SheetCloseLifecycle, index: number): SheetCloseLifecycle {
  if (index >= 0) {
    if (lifecycle.openReported && !lifecycle.restsClosed) return lifecycle;
    return { ...lifecycle, openReported: true, restsClosed: false };
  }
  // A -1 with no index reported since the open belongs to the close before it.
  if (!lifecycle.openReported || lifecycle.restsClosed) return lifecycle;
  return { ...lifecycle, restsClosed: true };
}

export function settleSheetCloseLifecycle(
  lifecycle: SheetCloseLifecycle,
  index: number,
): SheetCloseSettlement {
  if (lifecycle.isOpen) {
    return { lifecycle: settleOpenSheet(lifecycle, index), shouldComplete: false };
  }
  const shouldComplete = index === -1 && lifecycle.hasOpened && !lifecycle.completed;
  return {
    lifecycle: shouldComplete
      ? {
          hasOpened: false,
          isOpen: false,
          completed: true,
          openReported: false,
          restsClosed: false,
        }
      : lifecycle,
    shouldComplete,
  };
}
