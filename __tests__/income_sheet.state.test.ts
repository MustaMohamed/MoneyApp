import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';

beforeEach(() => useIncomeSheetState.getState().reset());

describe('useIncomeSheetState', () => {
  it('initialises with closed sheet, empty text, null suggestion', () => {
    const s = useIncomeSheetState.getState();
    expect(s.isOpen).toBe(false);
    expect(s.amountText).toBe('');
    expect(s.suggestion).toBeNull();
    expect(s.saving).toBe(false);
  });

  it('open with suggestion pre-fills amountText from suggestion when no current income', () => {
    useIncomeSheetState.getState().open(15000, null);
    const s = useIncomeSheetState.getState();
    expect(s.isOpen).toBe(true);
    expect(s.suggestion).toBe(15000);
    expect(s.amountText).toBe('15000');
  });

  it('open with current income pre-fills amountText from current income over suggestion', () => {
    useIncomeSheetState.getState().open(15000, 20000);
    const s = useIncomeSheetState.getState();
    expect(s.amountText).toBe('20000');
  });

  it('open with neither suggestion nor current income leaves amountText empty', () => {
    useIncomeSheetState.getState().open(null, null);
    const s = useIncomeSheetState.getState();
    expect(s.amountText).toBe('');
  });

  it('close sets isOpen to false', () => {
    useIncomeSheetState.getState().open(null, null);
    useIncomeSheetState.getState().close();
    expect(useIncomeSheetState.getState().isOpen).toBe(false);
  });

  it('setAmountText updates the text', () => {
    useIncomeSheetState.getState().setAmountText('9999');
    expect(useIncomeSheetState.getState().amountText).toBe('9999');
  });

  it('tracks and clears the save loading state', () => {
    useIncomeSheetState.getState().open(null, null);
    useIncomeSheetState.getState().setSaving(true);
    expect(useIncomeSheetState.getState().saving).toBe(true);
    useIncomeSheetState.getState().close();
    expect(useIncomeSheetState.getState().saving).toBe(false);
  });

  it('reset restores initial state', () => {
    useIncomeSheetState.getState().open(5000, 6000);
    useIncomeSheetState.getState().reset();
    const s = useIncomeSheetState.getState();
    expect(s.isOpen).toBe(false);
    expect(s.amountText).toBe('');
    expect(s.suggestion).toBeNull();
  });
});
