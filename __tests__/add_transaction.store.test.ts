import { act, renderHook } from '@testing-library/react-native';

import { TransactionType } from '@/constants/enums';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';

function setup() {
  const hook = renderHook(() => useAddTransactionStore());
  act(() => hook.result.current.reset());
  return hook;
}

describe('useAddTransactionStore initial state', () => {
  it('starts with type=Expense and amountStr="0"', () => {
    const { result } = setup();

    expect(result.current.state.type.value).toBe(TransactionType.Expense);
    expect(result.current.state.amountStr.value).toBe('0');
  });
});

describe('useAddTransactionStore.setType', () => {
  it('sets the transaction type and resets amountStr to "0"', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.setType(TransactionType.Income));

    expect(result.current.state.type.value).toBe(TransactionType.Income);
    expect(result.current.state.amountStr.value).toBe('0');
  });
});

describe('useAddTransactionStore.handleNumpad', () => {
  it('digit replaces "0" with the digit (leading-zero guard)', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));

    expect(result.current.state.amountStr.value).toBe('5');
  });

  it('pressing "0" when amountStr is "0" keeps it "0"', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '0'));

    expect(result.current.state.amountStr.value).toBe('0');
  });

  it('digit appends to a non-zero string', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('digit', '3'));

    expect(result.current.state.amountStr.value).toBe('53');
  });

  it('decimal appends "." when not already present', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('decimal'));

    expect(result.current.state.amountStr.value).toBe('5.');
  });

  it('decimal is a no-op when "." is already present', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('decimal'));
    act(() => result.current.handleNumpad('decimal'));

    expect(result.current.state.amountStr.value).toBe('5.');
  });

  it('backspace removes the last character', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('digit', '3'));
    act(() => result.current.handleNumpad('backspace'));

    expect(result.current.state.amountStr.value).toBe('5');
  });

  it('backspace on a single character resets to "0"', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('backspace'));

    expect(result.current.state.amountStr.value).toBe('0');
  });

  it('limits decimal digits to 2', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('decimal'));
    act(() => result.current.handleNumpad('digit', '1'));
    act(() => result.current.handleNumpad('digit', '2'));
    act(() => result.current.handleNumpad('digit', '3'));

    expect(result.current.state.amountStr.value).toBe('5.12');
  });

  it('digit action without value argument defaults to empty string', () => {
    const { result } = setup();

    act(() => result.current.handleNumpad('digit', '5'));
    act(() => result.current.handleNumpad('digit'));

    expect(result.current.state.amountStr.value).toBe('5');
  });
});

describe('useAddTransactionStore.reset', () => {
  it('resets type and amountStr to initial values', () => {
    const { result } = setup();

    act(() => result.current.setType(TransactionType.Transfer));
    act(() => result.current.handleNumpad('digit', '7'));
    act(() => result.current.reset());

    expect(result.current.state.type.value).toBe(TransactionType.Expense);
    expect(result.current.state.amountStr.value).toBe('0');
  });
});
