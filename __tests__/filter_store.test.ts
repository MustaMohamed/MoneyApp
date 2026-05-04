import { Currency, DatePreset } from '@/constants/enums';
import { EMPTY_FILTERS, useFilterDrawerStore } from '@/screens/transactions/filter/filter.store';

beforeEach(() => {
  useFilterDrawerStore.setState({
    state: { ...useFilterDrawerStore.getState().state, draft: EMPTY_FILTERS },
  });
});

describe('useFilterDrawerStore — initial state', () => {
  it('initial draft is EMPTY_FILTERS', () => {
    expect(useFilterDrawerStore.getState().state.draft).toEqual(EMPTY_FILTERS);
  });
});

describe('useFilterDrawerStore — draft setters', () => {
  it('setDraft replaces the draft', () => {
    const next = { ...EMPTY_FILTERS, accountIds: ['a', 'b'] };
    useFilterDrawerStore.getState().setDraft(next);
    expect(useFilterDrawerStore.getState().state.draft).toEqual(next);
  });

  it('resetDraft clears draft to EMPTY_FILTERS', () => {
    useFilterDrawerStore.setState({
      state: {
        ...useFilterDrawerStore.getState().state,
        draft: { ...EMPTY_FILTERS, accountIds: ['x'], amountMin: 100 },
      },
    });
    useFilterDrawerStore.getState().resetDraft();
    expect(useFilterDrawerStore.getState().state.draft).toEqual(EMPTY_FILTERS);
  });

  it('toggleAccountId adds when missing', () => {
    useFilterDrawerStore.getState().toggleAccountId('a');
    expect(useFilterDrawerStore.getState().state.draft.accountIds).toEqual(['a']);
  });

  it('toggleAccountId removes when present', () => {
    useFilterDrawerStore.setState({
      state: {
        ...useFilterDrawerStore.getState().state,
        draft: { ...EMPTY_FILTERS, accountIds: ['a', 'b'] },
      },
    });
    useFilterDrawerStore.getState().toggleAccountId('a');
    expect(useFilterDrawerStore.getState().state.draft.accountIds).toEqual(['b']);
  });

  it('toggleCategoryId adds and removes', () => {
    useFilterDrawerStore.getState().toggleCategoryId('c');
    expect(useFilterDrawerStore.getState().state.draft.categoryIds).toEqual(['c']);
    useFilterDrawerStore.getState().toggleCategoryId('c');
    expect(useFilterDrawerStore.getState().state.draft.categoryIds).toEqual([]);
  });

  it('setDatePreset updates only the preset, preserving custom dates', () => {
    useFilterDrawerStore.setState({
      state: {
        ...useFilterDrawerStore.getState().state,
        draft: {
          ...EMPTY_FILTERS,
          datePreset: DatePreset.Custom,
          customDateFrom: '2026-01-01',
          customDateTo: '2026-01-31',
        },
      },
    });
    useFilterDrawerStore.getState().setDatePreset(DatePreset.ThisMonth);
    const d = useFilterDrawerStore.getState().state.draft;
    expect(d.datePreset).toBe(DatePreset.ThisMonth);
    expect(d.customDateFrom).toBe('2026-01-01');
    expect(d.customDateTo).toBe('2026-01-31');
  });

  it('setCustomDateRange writes both dates and forces preset to Custom', () => {
    useFilterDrawerStore.getState().setCustomDateRange('2026-02-01', '2026-02-28');
    const d = useFilterDrawerStore.getState().state.draft;
    expect(d.customDateFrom).toBe('2026-02-01');
    expect(d.customDateTo).toBe('2026-02-28');
    expect(d.datePreset).toBe(DatePreset.Custom);
  });

  it('setAmountMin and setAmountMax independently update', () => {
    useFilterDrawerStore.getState().setAmountMin(10);
    expect(useFilterDrawerStore.getState().state.draft.amountMin).toBe(10);
    useFilterDrawerStore.getState().setAmountMax(50);
    expect(useFilterDrawerStore.getState().state.draft.amountMax).toBe(50);
  });

  it('setAmountMin(undefined) clears the value', () => {
    useFilterDrawerStore.setState({
      state: {
        ...useFilterDrawerStore.getState().state,
        draft: { ...EMPTY_FILTERS, amountMin: 100 },
      },
    });
    useFilterDrawerStore.getState().setAmountMin(undefined);
    expect(useFilterDrawerStore.getState().state.draft.amountMin).toBeUndefined();
  });

  it('setAmountCurrency switches the currency', () => {
    useFilterDrawerStore.getState().setAmountCurrency(Currency.USD);
    expect(useFilterDrawerStore.getState().state.draft.amountCurrency).toBe(Currency.USD);
  });
});
