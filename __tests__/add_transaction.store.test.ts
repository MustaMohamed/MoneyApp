import { TransactionType } from '@/constants/enums';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';

beforeEach(() => useAddTransactionStore().reset());

describe('useAddTransactionStore initial state', () => {
  it('starts with type=Expense and amountStr="0"', () => {
    const { state } = useAddTransactionStore();
    expect(state.type.value).toBe(TransactionType.Expense);
    expect(state.amountStr.value).toBe('0');
  });
});

describe('useAddTransactionStore.setType', () => {
  it('sets the transaction type and resets amountStr to "0"', () => {
    useAddTransactionStore().handleNumpad('digit', '5');
    useAddTransactionStore().setType(TransactionType.Income);
    const { state } = useAddTransactionStore();
    expect(state.type.value).toBe(TransactionType.Income);
    expect(state.amountStr.value).toBe('0');
  });
});

describe('useAddTransactionStore.handleNumpad', () => {
  it('digit replaces "0" with the digit (leading-zero guard)', () => {
    useAddTransactionStore().handleNumpad('digit', '5');
    expect(useAddTransactionStore().state.amountStr.value).toBe('5');
  });

  it('pressing "0" when amountStr is "0" keeps it "0"', () => {
    useAddTransactionStore().handleNumpad('digit', '0');
    expect(useAddTransactionStore().state.amountStr.value).toBe('0');
  });

  it('digit appends to a non-zero string', () => {
    useAddTransactionStore().handleNumpad('digit', '5');
    useAddTransactionStore().handleNumpad('digit', '3');
    expect(useAddTransactionStore().state.amountStr.value).toBe('53');
  });

  it('decimal appends "." when not already present', () => {
    useAddTransactionStore().handleNumpad('digit', '5');
    useAddTransactionStore().handleNumpad('decimal');
    expect(useAddTransactionStore().state.amountStr.value).toBe('5.');
  });

  it('decimal is a no-op when "." is already present', () => {
    useAddTransactionStore().handleNumpad('digit', '5');
    useAddTransactionStore().handleNumpad('decimal');
    useAddTransactionStore().handleNumpad('decimal');
    expect(useAddTransactionStore().state.amountStr.value).toBe('5.');
  });

  it('backspace removes the last character', () => {
    useAddTransactionStore().handleNumpad('digit', '5');
    useAddTransactionStore().handleNumpad('digit', '3');
    useAddTransactionStore().handleNumpad('backspace');
    expect(useAddTransactionStore().state.amountStr.value).toBe('5');
  });

  it('backspace on a single character resets to "0"', () => {
    useAddTransactionStore().handleNumpad('digit', '5');
    useAddTransactionStore().handleNumpad('backspace');
    expect(useAddTransactionStore().state.amountStr.value).toBe('0');
  });

  it('limits decimal digits to 2', () => {
    useAddTransactionStore().handleNumpad('digit', '5');
    useAddTransactionStore().handleNumpad('decimal');
    useAddTransactionStore().handleNumpad('digit', '1');
    useAddTransactionStore().handleNumpad('digit', '2');
    // Third decimal digit should be ignored
    useAddTransactionStore().handleNumpad('digit', '3');
    expect(useAddTransactionStore().state.amountStr.value).toBe('5.12');
  });

  it('digit action without value argument defaults to empty string (covers ?? "" branch)', () => {
    // When value is undefined, digit ?? '' = '' — pressing digit with no value is a no-op on non-zero
    useAddTransactionStore().handleNumpad('digit', '5');
    useAddTransactionStore().handleNumpad('digit'); // value = undefined → digit = ''
    expect(useAddTransactionStore().state.amountStr.value).toBe('5'); // '' appended → '5'
  });
});

describe('useAddTransactionStore.reset', () => {
  it('resets type and amountStr to initial values', () => {
    useAddTransactionStore().setType(TransactionType.Transfer);
    useAddTransactionStore().handleNumpad('digit', '7');
    useAddTransactionStore().reset();
    const { state } = useAddTransactionStore();
    expect(state.type.value).toBe(TransactionType.Expense);
    expect(state.amountStr.value).toBe('0');
  });
});
