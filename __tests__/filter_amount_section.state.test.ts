import { useFilterAmountSectionState } from '@/screens/transactions/filter/components/filter_amount_section.state';

beforeEach(() => useFilterAmountSectionState.getState().reset());

describe('useFilterAmountSectionState — initial state', () => {
  it('starts with both min and max strings empty', () => {
    const s = useFilterAmountSectionState.getState().state;
    expect(s.minStr).toBe('');
    expect(s.maxStr).toBe('');
  });
});

describe('useFilterAmountSectionState — setMinStr', () => {
  it('stores the provided value', () => {
    useFilterAmountSectionState.getState().setMinStr('122,300');
    expect(useFilterAmountSectionState.getState().state.minStr).toBe('122,300');
  });

  it('does not affect maxStr', () => {
    useFilterAmountSectionState.setState({
      state: { minStr: '', maxStr: '500' },
    });
    useFilterAmountSectionState.getState().setMinStr('100');
    const s = useFilterAmountSectionState.getState().state;
    expect(s.minStr).toBe('100');
    expect(s.maxStr).toBe('500');
  });

  it('can clear the value back to empty string', () => {
    useFilterAmountSectionState.setState({
      state: { minStr: '999', maxStr: '' },
    });
    useFilterAmountSectionState.getState().setMinStr('');
    expect(useFilterAmountSectionState.getState().state.minStr).toBe('');
  });
});

describe('useFilterAmountSectionState — setMaxStr', () => {
  it('stores the provided value', () => {
    useFilterAmountSectionState.getState().setMaxStr('9,999');
    expect(useFilterAmountSectionState.getState().state.maxStr).toBe('9,999');
  });

  it('does not affect minStr', () => {
    useFilterAmountSectionState.setState({
      state: { minStr: '50', maxStr: '' },
    });
    useFilterAmountSectionState.getState().setMaxStr('200');
    const s = useFilterAmountSectionState.getState().state;
    expect(s.minStr).toBe('50');
    expect(s.maxStr).toBe('200');
  });

  it('can clear the value back to empty string', () => {
    useFilterAmountSectionState.setState({
      state: { minStr: '', maxStr: '777' },
    });
    useFilterAmountSectionState.getState().setMaxStr('');
    expect(useFilterAmountSectionState.getState().state.maxStr).toBe('');
  });
});

describe('useFilterAmountSectionState — reset', () => {
  it('resets every field to initial', () => {
    useFilterAmountSectionState.setState({
      state: { minStr: '100', maxStr: '500' },
    });
    useFilterAmountSectionState.getState().reset();
    const s = useFilterAmountSectionState.getState().state;
    expect(s.minStr).toBe('');
    expect(s.maxStr).toBe('');
  });
});
