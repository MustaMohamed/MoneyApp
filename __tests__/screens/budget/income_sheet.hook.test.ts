import { act, renderHook } from '@testing-library/react-native';

import { useIncomeSheet } from '@/modules/budget/screens/budget/components/income_sheet.hook';
import { useIncomeSheetState } from '@/modules/budget/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/modules/budget/store/budget.store';

beforeEach(() => {
  useIncomeSheetState.getState().reset();
});

describe('useIncomeSheet save failures', () => {
  it('shows an error and preserves the amount after persistence rejects', async () => {
    const setExpectedIncome = jest.fn().mockRejectedValue(new Error('write failed'));
    useBudgetStore.setState({ setExpectedIncome } as never);
    useIncomeSheetState.getState().open(null, null);
    const { result } = renderHook(() => useIncomeSheet());

    act(() => result.current.setAmountText('12000'));
    await act(async () => result.current.save());

    expect(result.current.state.errorMessage).toBe(
      'Could not save expected income. Please try again.',
    );
    expect(result.current.state.amountText).toBe('12000');
    expect(result.current.state.isOpen).toBe(true);
  });
});
