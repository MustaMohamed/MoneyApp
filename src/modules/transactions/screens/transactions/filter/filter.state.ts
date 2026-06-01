import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

type AccordionSection = 'accounts' | 'categories' | 'amount' | null;

type FilterSignalState = {
  visible: ReadonlySignal<boolean>;
  openSection: ReadonlySignal<AccordionSection>;
  dateRangeSheetVisible: ReadonlySignal<boolean>;
};

class FilterState {
  private readonly visible = signal(false);
  private readonly openSection = signal<AccordionSection>(null);
  private readonly dateRangeSheetVisible = signal(false);

  readonly state: FilterSignalState = {
    visible: this.visible,
    openSection: this.openSection,
    dateRangeSheetVisible: this.dateRangeSheetVisible,
  };

  open = () => {
    this.visible.value = true;
  };
  close = () => {
    batch(() => {
      this.visible.value = false;
      this.openSection.value = null;
    });
  };
  toggleSection = (target: AccordionSection) => {
    this.openSection.value = this.openSection.value === target ? null : target;
  };
  setDateRangeSheetVisible = (v: boolean) => {
    this.dateRangeSheetVisible.value = v;
  };
  reset = () => {
    batch(() => {
      this.visible.value = false;
      this.openSection.value = null;
      this.dateRangeSheetVisible.value = false;
    });
  };
}

const filterState = new FilterState();

export function useFilterState(): FilterState {
  return filterState;
}
