import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';

beforeEach(() => useIncomeSheetState.getState().reset());

describe('useIncomeSheetState', () => {
  it('initialises with closed sheet, empty text, null suggestion', () => {
    const s = useIncomeSheetState.getState();
    expect(s.isOpen).toBe(false);
    expect(s.amountText).toBe('');
    expect(s.suggestion).toBeNull();
    expect(s.yearMonth).toBeUndefined();
    expect(s.monthLabel).toBeUndefined();
    expect(s.saving).toBe(false);
    expect(s.errorMessage).toBeUndefined();
  });

  it('open with suggestion pre-fills amountText from suggestion when no current income', () => {
    useIncomeSheetState.getState().open(15000, null, '2026-07', 'July 2026');
    const s = useIncomeSheetState.getState();
    expect(s.isOpen).toBe(true);
    expect(s.suggestion).toBe(15000);
    expect(s.amountText).toBe('15000');
    expect(s.yearMonth).toBe('2026-07');
    expect(s.monthLabel).toBe('July 2026');
  });

  it('open with current income pre-fills amountText from current income over suggestion', () => {
    useIncomeSheetState.getState().open(15000, 20000, '2026-07', 'July 2026');
    const s = useIncomeSheetState.getState();
    expect(s.amountText).toBe('20000');
  });

  // `String(1e-7)` is '1e-7', which DECIMAL_PATTERN rejects -- the field would
  // open holding text its own validator refuses, unsaveable without retyping a
  // value the user never chose. 1e-7 is reachable: `expected_income`'s CHECK is
  // only `> 0 AND <= 9007199254740991` and migration 016's backfill writes a
  // CAST of a legacy app_settings string without the form's 0.01 floor. Red
  // against `String(currentIncome)`.
  it('prefills a current income as positional digits, never exponent form', () => {
    useIncomeSheetState.getState().open(null, 1e-7, '2026-07', 'July 2026');
    const { amountText } = useIncomeSheetState.getState();
    expect(amountText).toBe('0.0000001');
    expect(amountText).not.toMatch(/e/i);
  });

  // The suggestion is the other half of the same `??`, and it is an average --
  // ROUND(AVG(...)) over egp_amount, a column with no CHECK of its own.
  it('prefills a suggestion as positional digits, never exponent form', () => {
    useIncomeSheetState.getState().open(1e-7, null, '2026-07', 'July 2026');
    const { amountText } = useIncomeSheetState.getState();
    expect(amountText).toBe('0.0000001');
    expect(amountText).not.toMatch(/e/i);
  });

  it('open with neither suggestion nor current income leaves amountText empty', () => {
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    const s = useIncomeSheetState.getState();
    expect(s.amountText).toBe('');
  });

  it('close sets isOpen to false', () => {
    useIncomeSheetState.getState().open(null, null, '2026-07', 'July 2026');
    useIncomeSheetState.getState().close();
    expect(useIncomeSheetState.getState().isOpen).toBe(false);
  });

  it('setAmountText updates the text', () => {
    useIncomeSheetState.getState().setErrorMessage('Save failed');
    useIncomeSheetState.getState().setAmountText('9999');
    expect(useIncomeSheetState.getState().amountText).toBe('9999');
    expect(useIncomeSheetState.getState().errorMessage).toBeUndefined();
  });

  it('stores a visible save error', () => {
    useIncomeSheetState.getState().setErrorMessage('Save failed');
    expect(useIncomeSheetState.getState().errorMessage).toBe('Save failed');
  });

  it('blocks close and reopen while saving', () => {
    useIncomeSheetState.getState().open(null, null, '2026-06', 'June 2026');
    useIncomeSheetState.getState().setAmountText('12000');
    useIncomeSheetState.getState().setSaving(true);

    useIncomeSheetState.getState().close();
    useIncomeSheetState.getState().open(null, 9000, '2026-07', 'July 2026');

    expect(useIncomeSheetState.getState()).toMatchObject({
      isOpen: true,
      saving: true,
      amountText: '12000',
      yearMonth: '2026-06',
      monthLabel: 'June 2026',
    });

    useIncomeSheetState.getState().setSaving(false);
    useIncomeSheetState.getState().close();
    expect(useIncomeSheetState.getState().isOpen).toBe(false);
  });

  it('reset restores initial state', () => {
    useIncomeSheetState.getState().open(5000, 6000, '2026-07', 'July 2026');
    useIncomeSheetState.getState().reset();
    const s = useIncomeSheetState.getState();
    expect(s.isOpen).toBe(false);
    expect(s.amountText).toBe('');
    expect(s.suggestion).toBeNull();
    expect(s.yearMonth).toBeUndefined();
    expect(s.monthLabel).toBeUndefined();
  });
});
