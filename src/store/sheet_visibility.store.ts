import { makeAutoObservable, reaction } from 'mobx';
import { useSyncExternalStore } from 'react';

const INITIAL_COUNT = 0;

export class SheetVisibilityStore {
  count = INITIAL_COUNT;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get anyOpen(): boolean {
    return this.count > 0;
  }

  increment(): void {
    this.count += 1;
  }

  decrement(): void {
    // Floor at 0 so a leaked decrement (Sheet unmounted-twice, double-cleanup,
    // etc.) doesn't pin the counter at a negative value and break un-hiding
    // the FAB forever. Warn in dev so the underlying leak is at least visible
    // — silent floor would let the bug hide indefinitely.
    if (__DEV__ && this.count === 0) {
      console.warn(
        '[sheet_visibility] decrement called while count is already 0 — ' +
          'a Sheet likely fired its cleanup decrement twice. ' +
          'Investigate the Sheet whose visible just flipped.',
      );
    }
    this.count = Math.max(0, this.count - 1);
  }

  reset(): void {
    this.count = INITIAL_COUNT;
  }
}

export const sheetVisibilityStore = new SheetVisibilityStore();

export function useSheetVisibilityStore(): SheetVisibilityStore {
  return sheetVisibilityStore;
}

function subscribeToAnySheetOpen(onStoreChange: () => void): () => void {
  return reaction(() => sheetVisibilityStore.anyOpen, onStoreChange);
}

function getAnySheetOpenSnapshot(): boolean {
  return sheetVisibilityStore.anyOpen;
}

/** Returns true when at least one Sheet is currently open. */
export function useAnySheetOpen(): boolean {
  return useSyncExternalStore(
    subscribeToAnySheetOpen,
    getAnySheetOpenSnapshot,
    getAnySheetOpenSnapshot,
  );
}
