import { signal, type ReadonlySignal } from '@preact/signals-react';

const INITIAL_COUNT = 0;

export class SheetVisibilityStore {
  private readonly count = signal(INITIAL_COUNT);

  readonly state = {
    count: this.count as ReadonlySignal<number>,
  };

  increment = () => {
    this.count.value += 1;
  };

  decrement = () => {
    // Floor at 0 so a leaked decrement (Sheet unmounted-twice, double-cleanup,
    // etc.) doesn't pin the counter at a negative value and break un-hiding
    // the FAB forever. Warn in dev so the underlying leak is at least visible.
    if (__DEV__ && this.count.value === 0) {
      console.warn(
        '[sheet_visibility] decrement called while count is already 0 - ' +
          'a Sheet likely fired its cleanup decrement twice. ' +
          'Investigate the Sheet whose visible just flipped.',
      );
    }
    this.count.value = Math.max(0, this.count.value - 1);
  };

  reset = () => {
    this.count.value = INITIAL_COUNT;
  };
}

const sheetVisibilityStore = new SheetVisibilityStore();

export function useSheetVisibilityStore(): SheetVisibilityStore {
  return sheetVisibilityStore;
}

/** Returns true when at least one Sheet is currently open. */
export function useAnySheetOpen(): boolean {
  return useSheetVisibilityStore().state.count.value > 0;
}
