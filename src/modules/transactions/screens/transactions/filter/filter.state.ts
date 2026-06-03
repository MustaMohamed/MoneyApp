import { batch, signal } from '@preact/signals-react';

type AccordionSection = 'accounts' | 'categories' | 'amount' | null;

const visible = signal(false);
const openSection = signal<AccordionSection>(null);
const dateRangeSheetVisible = signal(false);

function open(): void {
  visible.value = true;
}

function close(): void {
  batch(() => {
    visible.value = false;
    openSection.value = null;
  });
}

function toggleSection(target: AccordionSection): void {
  openSection.value = openSection.value === target ? null : target;
}

function setDateRangeSheetVisible(v: boolean): void {
  dateRangeSheetVisible.value = v;
}

function reset(): void {
  batch(() => {
    visible.value = false;
    openSection.value = null;
    dateRangeSheetVisible.value = false;
  });
}

export function useFilterState() {
  return {
    state: {
      visible,
      openSection,
      dateRangeSheetVisible,
    },
    open,
    close,
    toggleSection,
    setDateRangeSheetVisible,
    reset,
  };
}
