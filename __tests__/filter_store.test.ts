import { Currency, DatePreset } from '@/constants/enums';
import {
  EMPTY_FILTERS,
  useFilterDrawerStore,
} from '@/app/(app)/(tabs)/transactions/_filter/filter.store';

beforeEach(() => {
  useFilterDrawerStore.setState({
    visible: false,
    draft: EMPTY_FILTERS,
    accountPickerVisible: false,
    categoryPickerVisible: false,
    customDatePickerVisible: false,
  });
});

describe('useFilterDrawerStore — lifecycle', () => {
  it('initial state is invisible with EMPTY_FILTERS draft', () => {
    const s = useFilterDrawerStore.getState();
    expect(s.visible).toBe(false);
    expect(s.draft).toEqual(EMPTY_FILTERS);
  });

  it('open(initial) snapshots initial into draft and sets visible', () => {
    const initial = { ...EMPTY_FILTERS, accountIds: ['a', 'b'] };
    useFilterDrawerStore.getState().open(initial);
    const s = useFilterDrawerStore.getState();
    expect(s.visible).toBe(true);
    expect(s.draft).toEqual(initial);
  });

  it('close flips visible to false and dismisses any open sub-pickers', () => {
    useFilterDrawerStore.setState({
      visible: true,
      accountPickerVisible: true,
      categoryPickerVisible: true,
      customDatePickerVisible: true,
    });
    useFilterDrawerStore.getState().close();
    const s = useFilterDrawerStore.getState();
    expect(s.visible).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });

  it('resetDraft clears draft to EMPTY_FILTERS without changing visible', () => {
    useFilterDrawerStore.setState({
      visible: true,
      draft: { ...EMPTY_FILTERS, accountIds: ['x'], amountMin: 100 },
    });
    useFilterDrawerStore.getState().resetDraft();
    const s = useFilterDrawerStore.getState();
    expect(s.draft).toEqual(EMPTY_FILTERS);
    expect(s.visible).toBe(true);
  });
});

describe('useFilterDrawerStore — draft setters', () => {
  it('toggleAccountId adds when missing', () => {
    useFilterDrawerStore.getState().toggleAccountId('a');
    expect(useFilterDrawerStore.getState().draft.accountIds).toEqual(['a']);
  });

  it('toggleAccountId removes when present', () => {
    useFilterDrawerStore.setState({
      draft: { ...EMPTY_FILTERS, accountIds: ['a', 'b'] },
    });
    useFilterDrawerStore.getState().toggleAccountId('a');
    expect(useFilterDrawerStore.getState().draft.accountIds).toEqual(['b']);
  });

  it('toggleCategoryId adds and removes', () => {
    useFilterDrawerStore.getState().toggleCategoryId('c');
    expect(useFilterDrawerStore.getState().draft.categoryIds).toEqual(['c']);
    useFilterDrawerStore.getState().toggleCategoryId('c');
    expect(useFilterDrawerStore.getState().draft.categoryIds).toEqual([]);
  });

  it('setDatePreset updates only the preset, preserving custom dates', () => {
    useFilterDrawerStore.setState({
      draft: {
        ...EMPTY_FILTERS,
        datePreset: DatePreset.Custom,
        customDateFrom: '2026-01-01',
        customDateTo: '2026-01-31',
      },
    });
    useFilterDrawerStore.getState().setDatePreset(DatePreset.ThisMonth);
    const d = useFilterDrawerStore.getState().draft;
    expect(d.datePreset).toBe(DatePreset.ThisMonth);
    expect(d.customDateFrom).toBe('2026-01-01');
    expect(d.customDateTo).toBe('2026-01-31');
  });

  it('setCustomDateRange writes both dates and forces preset to Custom', () => {
    useFilterDrawerStore.getState().setCustomDateRange('2026-02-01', '2026-02-28');
    const d = useFilterDrawerStore.getState().draft;
    expect(d.customDateFrom).toBe('2026-02-01');
    expect(d.customDateTo).toBe('2026-02-28');
    expect(d.datePreset).toBe(DatePreset.Custom);
  });

  it('setAmountMin and setAmountMax independently update', () => {
    useFilterDrawerStore.getState().setAmountMin(10);
    expect(useFilterDrawerStore.getState().draft.amountMin).toBe(10);
    useFilterDrawerStore.getState().setAmountMax(50);
    expect(useFilterDrawerStore.getState().draft.amountMax).toBe(50);
  });

  it('setAmountMin(undefined) clears the value', () => {
    useFilterDrawerStore.setState({ draft: { ...EMPTY_FILTERS, amountMin: 100 } });
    useFilterDrawerStore.getState().setAmountMin(undefined);
    expect(useFilterDrawerStore.getState().draft.amountMin).toBeUndefined();
  });

  it('setAmountCurrency switches the currency', () => {
    useFilterDrawerStore.getState().setAmountCurrency(Currency.USD);
    expect(useFilterDrawerStore.getState().draft.amountCurrency).toBe(Currency.USD);
  });
});

describe('useFilterDrawerStore — sub-picker visibility', () => {
  it('setAccountPickerVisible toggles the account picker flag only', () => {
    useFilterDrawerStore.getState().setAccountPickerVisible(true);
    const s = useFilterDrawerStore.getState();
    expect(s.accountPickerVisible).toBe(true);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });

  it('setCategoryPickerVisible and setCustomDatePickerVisible work independently', () => {
    useFilterDrawerStore.getState().setCategoryPickerVisible(true);
    expect(useFilterDrawerStore.getState().categoryPickerVisible).toBe(true);
    useFilterDrawerStore.getState().setCustomDatePickerVisible(true);
    expect(useFilterDrawerStore.getState().customDatePickerVisible).toBe(true);
  });
});
