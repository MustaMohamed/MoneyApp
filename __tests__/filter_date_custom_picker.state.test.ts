import { useFilterDateCustomPickerState } from '@/screens/transactions/filter/components/filter_date_custom_picker.state';

beforeEach(() => useFilterDateCustomPickerState.getState().reset());

describe('useFilterDateCustomPickerState — initial state', () => {
  it('starts with both dates undefined and both pickers closed', () => {
    const s = useFilterDateCustomPickerState.getState().state;
    expect(s.from).toBeUndefined();
    expect(s.to).toBeUndefined();
    expect(s.showFromPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
  });
});

describe('useFilterDateCustomPickerState — setFrom / setTo', () => {
  it('setFrom stores a Date value', () => {
    const d = new Date(2026, 0, 15);
    useFilterDateCustomPickerState.getState().setFrom(d);
    expect(useFilterDateCustomPickerState.getState().state.from).toBe(d);
  });

  it('setFrom can clear the value with undefined', () => {
    useFilterDateCustomPickerState.setState({
      state: {
        from: new Date(2026, 0, 1),
        to: undefined,
        showFromPicker: false,
        showToPicker: false,
      },
    });
    useFilterDateCustomPickerState.getState().setFrom(undefined);
    expect(useFilterDateCustomPickerState.getState().state.from).toBeUndefined();
  });

  it('setTo stores a Date value', () => {
    const d = new Date(2026, 1, 20);
    useFilterDateCustomPickerState.getState().setTo(d);
    expect(useFilterDateCustomPickerState.getState().state.to).toBe(d);
  });

  it('setTo can clear the value with undefined', () => {
    useFilterDateCustomPickerState.setState({
      state: {
        from: undefined,
        to: new Date(2026, 1, 1),
        showFromPicker: false,
        showToPicker: false,
      },
    });
    useFilterDateCustomPickerState.getState().setTo(undefined);
    expect(useFilterDateCustomPickerState.getState().state.to).toBeUndefined();
  });
});

describe('useFilterDateCustomPickerState — picker visibility setters', () => {
  it('setShowFromPicker toggles only that flag', () => {
    useFilterDateCustomPickerState.getState().setShowFromPicker(true);
    const s = useFilterDateCustomPickerState.getState().state;
    expect(s.showFromPicker).toBe(true);
    expect(s.showToPicker).toBe(false);
    useFilterDateCustomPickerState.getState().setShowFromPicker(false);
    expect(useFilterDateCustomPickerState.getState().state.showFromPicker).toBe(false);
  });

  it('setShowToPicker toggles only that flag', () => {
    useFilterDateCustomPickerState.getState().setShowToPicker(true);
    const s = useFilterDateCustomPickerState.getState().state;
    expect(s.showToPicker).toBe(true);
    expect(s.showFromPicker).toBe(false);
    useFilterDateCustomPickerState.getState().setShowToPicker(false);
    expect(useFilterDateCustomPickerState.getState().state.showToPicker).toBe(false);
  });
});

describe('useFilterDateCustomPickerState — initialize', () => {
  it('sets both dates and closes both pickers when given Date values', () => {
    useFilterDateCustomPickerState.setState({
      state: {
        from: undefined,
        to: undefined,
        showFromPicker: true,
        showToPicker: true,
      },
    });
    const from = new Date(2026, 0, 1);
    const to = new Date(2026, 0, 31);
    useFilterDateCustomPickerState.getState().initialize(from, to);
    const s = useFilterDateCustomPickerState.getState().state;
    expect(s.from).toBe(from);
    expect(s.to).toBe(to);
    expect(s.showFromPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
  });

  it('sets both dates to undefined and closes both pickers when given undefined', () => {
    useFilterDateCustomPickerState.setState({
      state: {
        from: new Date(2026, 0, 1),
        to: new Date(2026, 0, 31),
        showFromPicker: true,
        showToPicker: true,
      },
    });
    useFilterDateCustomPickerState.getState().initialize(undefined, undefined);
    const s = useFilterDateCustomPickerState.getState().state;
    expect(s.from).toBeUndefined();
    expect(s.to).toBeUndefined();
    expect(s.showFromPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
  });
});

describe('useFilterDateCustomPickerState — reset', () => {
  it('resets every field to initial', () => {
    useFilterDateCustomPickerState.setState({
      state: {
        from: new Date(2026, 0, 1),
        to: new Date(2026, 0, 31),
        showFromPicker: true,
        showToPicker: true,
      },
    });
    useFilterDateCustomPickerState.getState().reset();
    const s = useFilterDateCustomPickerState.getState().state;
    expect(s.from).toBeUndefined();
    expect(s.to).toBeUndefined();
    expect(s.showFromPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
  });
});
