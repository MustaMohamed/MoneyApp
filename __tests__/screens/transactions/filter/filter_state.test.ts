import { useFilterState } from '@/modules/transactions/screens/transactions/filter/filter.state';

beforeEach(() => {
  useFilterState.getState().reset();
});

describe('useFilterState initial state', () => {
  it('starts hidden with no open section and date-range sheet closed', () => {
    const s = useFilterState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.openSection).toBeNull();
    expect(s.dateRangeSheetVisible).toBe(false);
  });
});

describe('useFilterState open/close', () => {
  it('open() makes the sheet visible', () => {
    useFilterState.getState().open();
    expect(useFilterState.getState().state.visible).toBe(true);
  });

  it('close() hides the sheet and collapses the open section', () => {
    useFilterState.getState().open();
    useFilterState.getState().toggleSection('accounts');
    useFilterState.getState().close();
    const s = useFilterState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.openSection).toBeNull();
  });
});

describe('useFilterState toggleSection', () => {
  it('opens a closed section', () => {
    useFilterState.getState().toggleSection('categories');
    expect(useFilterState.getState().state.openSection).toBe('categories');
  });

  it('closes the section when toggled with the same target', () => {
    useFilterState.getState().toggleSection('amount');
    useFilterState.getState().toggleSection('amount');
    expect(useFilterState.getState().state.openSection).toBeNull();
  });

  it('switches directly to a different section', () => {
    useFilterState.getState().toggleSection('accounts');
    useFilterState.getState().toggleSection('categories');
    expect(useFilterState.getState().state.openSection).toBe('categories');
  });
});

describe('useFilterState setDateRangeSheetVisible', () => {
  it('toggles the date-range sheet', () => {
    useFilterState.getState().setDateRangeSheetVisible(true);
    expect(useFilterState.getState().state.dateRangeSheetVisible).toBe(true);
    useFilterState.getState().setDateRangeSheetVisible(false);
    expect(useFilterState.getState().state.dateRangeSheetVisible).toBe(false);
  });
});

describe('useFilterState reset', () => {
  it('returns every field to its initial value', () => {
    useFilterState.getState().open();
    useFilterState.getState().toggleSection('accounts');
    useFilterState.getState().setDateRangeSheetVisible(true);
    useFilterState.getState().reset();
    const s = useFilterState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.openSection).toBeNull();
    expect(s.dateRangeSheetVisible).toBe(false);
  });
});
