import { useFilterDrawerState } from '@/screens/transactions/filter/filter.state';

beforeEach(() => useFilterDrawerState.getState().reset());

describe('useFilterDrawerState — initial state', () => {
  it('starts invisible with all sub-pickers closed', () => {
    const s = useFilterDrawerState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });
});

describe('useFilterDrawerState — open / close', () => {
  it('open flips visible to true', () => {
    useFilterDrawerState.getState().open();
    expect(useFilterDrawerState.getState().state.visible).toBe(true);
  });

  it('close resets every flag', () => {
    useFilterDrawerState.setState({
      state: {
        visible: true,
        accountPickerVisible: true,
        categoryPickerVisible: true,
        customDatePickerVisible: true,
      },
    });
    useFilterDrawerState.getState().close();
    const s = useFilterDrawerState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });
});

describe('useFilterDrawerState — sub-picker setters', () => {
  it('setAccountPickerVisible toggles only that flag', () => {
    useFilterDrawerState.getState().setAccountPickerVisible(true);
    const s = useFilterDrawerState.getState().state;
    expect(s.accountPickerVisible).toBe(true);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });

  it('setCategoryPickerVisible and setCustomDatePickerVisible work independently', () => {
    useFilterDrawerState.getState().setCategoryPickerVisible(true);
    expect(useFilterDrawerState.getState().state.categoryPickerVisible).toBe(true);
    useFilterDrawerState.getState().setCustomDatePickerVisible(true);
    expect(useFilterDrawerState.getState().state.customDatePickerVisible).toBe(true);
  });
});

describe('useFilterDrawerState — reset', () => {
  it('resets every flag', () => {
    useFilterDrawerState.setState({
      state: {
        visible: true,
        accountPickerVisible: true,
        categoryPickerVisible: true,
        customDatePickerVisible: true,
      },
    });
    useFilterDrawerState.getState().reset();
    const s = useFilterDrawerState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });
});
