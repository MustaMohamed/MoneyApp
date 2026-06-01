import { useFilterState } from '@/modules/transactions/screens/transactions/filter/filter.state';

beforeEach(() => {
  useFilterState().reset();
});

describe('useFilterState initial state', () => {
  it('starts hidden with no open section and date-range sheet closed', () => {
    const { state } = useFilterState();
    expect(state.visible.value).toBe(false);
    expect(state.openSection.value).toBeNull();
    expect(state.dateRangeSheetVisible.value).toBe(false);
  });
});

describe('useFilterState open/close', () => {
  it('open() makes the sheet visible', () => {
    useFilterState().open();
    expect(useFilterState().state.visible.value).toBe(true);
  });

  it('close() hides the sheet and collapses the open section', () => {
    useFilterState().open();
    useFilterState().toggleSection('accounts');
    useFilterState().close();
    const { state } = useFilterState();
    expect(state.visible.value).toBe(false);
    expect(state.openSection.value).toBeNull();
  });
});

describe('useFilterState toggleSection', () => {
  it('opens a closed section', () => {
    useFilterState().toggleSection('categories');
    expect(useFilterState().state.openSection.value).toBe('categories');
  });

  it('closes the section when toggled with the same target', () => {
    useFilterState().toggleSection('amount');
    useFilterState().toggleSection('amount');
    expect(useFilterState().state.openSection.value).toBeNull();
  });

  it('switches directly to a different section', () => {
    useFilterState().toggleSection('accounts');
    useFilterState().toggleSection('categories');
    expect(useFilterState().state.openSection.value).toBe('categories');
  });
});

describe('useFilterState setDateRangeSheetVisible', () => {
  it('toggles the date-range sheet', () => {
    useFilterState().setDateRangeSheetVisible(true);
    expect(useFilterState().state.dateRangeSheetVisible.value).toBe(true);
    useFilterState().setDateRangeSheetVisible(false);
    expect(useFilterState().state.dateRangeSheetVisible.value).toBe(false);
  });
});

describe('useFilterState reset', () => {
  it('returns every field to its initial value', () => {
    useFilterState().open();
    useFilterState().toggleSection('accounts');
    useFilterState().setDateRangeSheetVisible(true);
    useFilterState().reset();
    const { state } = useFilterState();
    expect(state.visible.value).toBe(false);
    expect(state.openSection.value).toBeNull();
    expect(state.dateRangeSheetVisible.value).toBe(false);
  });
});
