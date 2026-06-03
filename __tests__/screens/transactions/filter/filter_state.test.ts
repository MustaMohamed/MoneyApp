import { act, renderHook } from '@testing-library/react-native';

import { useFilterState } from '@/modules/transactions/screens/transactions/filter/filter.state';

function setup() {
  const hook = renderHook(() => useFilterState());
  act(() => hook.result.current.reset());
  return hook;
}

describe('useFilterState initial state', () => {
  it('starts hidden with no open section and date-range sheet closed', () => {
    const { result } = setup();
    const { state } = result.current;

    expect(state.visible.value).toBe(false);
    expect(state.openSection.value).toBeNull();
    expect(state.dateRangeSheetVisible.value).toBe(false);
  });
});

describe('useFilterState open/close', () => {
  it('open() makes the sheet visible', () => {
    const { result } = setup();

    act(() => result.current.open());

    expect(result.current.state.visible.value).toBe(true);
  });

  it('close() hides the sheet and collapses the open section', () => {
    const { result } = setup();

    act(() => result.current.open());
    act(() => result.current.toggleSection('accounts'));
    act(() => result.current.close());

    expect(result.current.state.visible.value).toBe(false);
    expect(result.current.state.openSection.value).toBeNull();
  });
});

describe('useFilterState toggleSection', () => {
  it('opens a closed section', () => {
    const { result } = setup();

    act(() => result.current.toggleSection('categories'));

    expect(result.current.state.openSection.value).toBe('categories');
  });

  it('closes the section when toggled with the same target', () => {
    const { result } = setup();

    act(() => result.current.toggleSection('amount'));
    act(() => result.current.toggleSection('amount'));

    expect(result.current.state.openSection.value).toBeNull();
  });

  it('switches directly to a different section', () => {
    const { result } = setup();

    act(() => result.current.toggleSection('accounts'));
    act(() => result.current.toggleSection('categories'));

    expect(result.current.state.openSection.value).toBe('categories');
  });
});

describe('useFilterState setDateRangeSheetVisible', () => {
  it('toggles the date-range sheet', () => {
    const { result } = setup();

    act(() => result.current.setDateRangeSheetVisible(true));
    expect(result.current.state.dateRangeSheetVisible.value).toBe(true);
    act(() => result.current.setDateRangeSheetVisible(false));
    expect(result.current.state.dateRangeSheetVisible.value).toBe(false);
  });
});

describe('useFilterState reset', () => {
  it('returns every field to its initial value', () => {
    const { result } = setup();

    act(() => result.current.open());
    act(() => result.current.toggleSection('accounts'));
    act(() => result.current.setDateRangeSheetVisible(true));
    act(() => result.current.reset());

    expect(result.current.state.visible.value).toBe(false);
    expect(result.current.state.openSection.value).toBeNull();
    expect(result.current.state.dateRangeSheetVisible.value).toBe(false);
  });
});
