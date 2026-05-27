import { TransactionType } from '@/constants/enums';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';

beforeEach(() => useAddTransactionStore.getState().reset());

describe('useAddTransactionStore initial state', () => {
  it('starts with type=Expense and amountStr="0"', () => {
    const s = useAddTransactionStore.getState().state;
    expect(s.type).toBe(TransactionType.Expense);
    expect(s.amountStr).toBe('0');
  });
});

describe('useAddTransactionStore.setType', () => {
  it('sets the transaction type and resets amountStr to "0"', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().setType(TransactionType.Income);
    const s = useAddTransactionStore.getState().state;
    expect(s.type).toBe(TransactionType.Income);
    expect(s.amountStr).toBe('0');
  });
});

describe('useAddTransactionStore.handleNumpad', () => {
  it('digit replaces "0" with the digit (leading-zero guard)', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    expect(useAddTransactionStore.getState().state.amountStr).toBe('5');
  });

  it('pressing "0" when amountStr is "0" keeps it "0"', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '0');
    expect(useAddTransactionStore.getState().state.amountStr).toBe('0');
  });

  it('digit appends to a non-zero string', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('digit', '3');
    expect(useAddTransactionStore.getState().state.amountStr).toBe('53');
  });

  it('decimal appends "." when not already present', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('decimal');
    expect(useAddTransactionStore.getState().state.amountStr).toBe('5.');
  });

  it('decimal is a no-op when "." is already present', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('decimal');
    useAddTransactionStore.getState().handleNumpad('decimal');
    expect(useAddTransactionStore.getState().state.amountStr).toBe('5.');
  });

  it('backspace removes the last character', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('digit', '3');
    useAddTransactionStore.getState().handleNumpad('backspace');
    expect(useAddTransactionStore.getState().state.amountStr).toBe('5');
  });

  it('backspace on a single character resets to "0"', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('backspace');
    expect(useAddTransactionStore.getState().state.amountStr).toBe('0');
  });

  it('limits decimal digits to 2', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('decimal');
    useAddTransactionStore.getState().handleNumpad('digit', '1');
    useAddTransactionStore.getState().handleNumpad('digit', '2');
    // Third decimal digit should be ignored
    useAddTransactionStore.getState().handleNumpad('digit', '3');
    expect(useAddTransactionStore.getState().state.amountStr).toBe('5.12');
  });

  it('digit action without value argument defaults to empty string (covers ?? "" branch)', () => {
    // When value is undefined, digit ?? '' = '' — pressing digit with no value is a no-op on non-zero
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('digit'); // value = undefined → digit = ''
    expect(useAddTransactionStore.getState().state.amountStr).toBe('5'); // '' appended → '5'
  });
});

describe('useAddTransactionStore.reset', () => {
  it('resets type and amountStr to initial values', () => {
    useAddTransactionStore.getState().setType(TransactionType.Transfer);
    useAddTransactionStore.getState().handleNumpad('digit', '7');
    useAddTransactionStore.getState().reset();
    const s = useAddTransactionStore.getState().state;
    expect(s.type).toBe(TransactionType.Expense);
    expect(s.amountStr).toBe('0');
  });
});
