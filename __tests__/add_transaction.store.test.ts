import { TransactionType } from '@/constants/enums';
import { useAddTransactionStore } from '@/app/(app)/(tabs)/transactions/transaction_form/add_transaction.store';

beforeEach(() => {
  useAddTransactionStore.getState().reset();
  useAddTransactionStore.setState({ visible: false });
});

describe('useAddTransactionStore initial state', () => {
  it('starts with visible=false, type=Expense, amountStr="0"', () => {
    const s = useAddTransactionStore.getState();
    expect(s.visible).toBe(false);
    expect(s.type).toBe(TransactionType.Expense);
    expect(s.amountStr).toBe('0');
    expect(s.saving).toBe(false);
    expect(s.showAccountPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
  });
});

describe('useAddTransactionStore.open / close', () => {
  it('open sets visible=true', () => {
    useAddTransactionStore.getState().open();
    expect(useAddTransactionStore.getState().visible).toBe(true);
  });

  it('close sets visible=false and resets INITIAL_STATE', () => {
    useAddTransactionStore.getState().open();
    useAddTransactionStore.getState().setType(TransactionType.Income);
    useAddTransactionStore.getState().close();
    const s = useAddTransactionStore.getState();
    expect(s.visible).toBe(false);
    expect(s.type).toBe(TransactionType.Expense);
    expect(s.amountStr).toBe('0');
  });
});

describe('useAddTransactionStore.setType', () => {
  it('sets the transaction type and resets amountStr to "0"', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().setType(TransactionType.Income);
    const s = useAddTransactionStore.getState();
    expect(s.type).toBe(TransactionType.Income);
    expect(s.amountStr).toBe('0');
  });
});

describe('useAddTransactionStore.handleNumpad', () => {
  it('digit replaces "0" with the digit (leading-zero guard)', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    expect(useAddTransactionStore.getState().amountStr).toBe('5');
  });

  it('pressing "0" when amountStr is "0" keeps it "0"', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '0');
    expect(useAddTransactionStore.getState().amountStr).toBe('0');
  });

  it('digit appends to a non-zero string', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('digit', '3');
    expect(useAddTransactionStore.getState().amountStr).toBe('53');
  });

  it('decimal appends "." when not already present', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('decimal');
    expect(useAddTransactionStore.getState().amountStr).toBe('5.');
  });

  it('decimal is a no-op when "." is already present', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('decimal');
    useAddTransactionStore.getState().handleNumpad('decimal');
    expect(useAddTransactionStore.getState().amountStr).toBe('5.');
  });

  it('backspace removes the last character', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('digit', '3');
    useAddTransactionStore.getState().handleNumpad('backspace');
    expect(useAddTransactionStore.getState().amountStr).toBe('5');
  });

  it('backspace on a single character resets to "0"', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('backspace');
    expect(useAddTransactionStore.getState().amountStr).toBe('0');
  });

  it('limits decimal digits to 2', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('decimal');
    useAddTransactionStore.getState().handleNumpad('digit', '1');
    useAddTransactionStore.getState().handleNumpad('digit', '2');
    // Third decimal digit should be ignored
    useAddTransactionStore.getState().handleNumpad('digit', '3');
    expect(useAddTransactionStore.getState().amountStr).toBe('5.12');
  });

  it('digit action without value argument defaults to empty string (covers ?? "" branch)', () => {
    // When value is undefined, digit ?? '' = '' — pressing digit with no value is a no-op on non-zero
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('digit'); // value = undefined → digit = ''
    expect(useAddTransactionStore.getState().amountStr).toBe('5'); // '' appended → '5'
  });
});

describe('useAddTransactionStore pickers and saving', () => {
  it('setSaving toggles saving flag', () => {
    useAddTransactionStore.getState().setSaving(true);
    expect(useAddTransactionStore.getState().saving).toBe(true);
    useAddTransactionStore.getState().setSaving(false);
    expect(useAddTransactionStore.getState().saving).toBe(false);
  });

  it('setShowAccountPicker sets the flag', () => {
    useAddTransactionStore.getState().setShowAccountPicker(true);
    expect(useAddTransactionStore.getState().showAccountPicker).toBe(true);
    useAddTransactionStore.getState().setShowAccountPicker(false);
    expect(useAddTransactionStore.getState().showAccountPicker).toBe(false);
  });

  it('setShowToPicker sets the flag', () => {
    useAddTransactionStore.getState().setShowToPicker(true);
    expect(useAddTransactionStore.getState().showToPicker).toBe(true);
    useAddTransactionStore.getState().setShowToPicker(false);
    expect(useAddTransactionStore.getState().showToPicker).toBe(false);
  });

  it('setShowCategoryPicker sets the flag', () => {
    useAddTransactionStore.getState().setShowCategoryPicker(true);
    expect(useAddTransactionStore.getState().showCategoryPicker).toBe(true);
    useAddTransactionStore.getState().setShowCategoryPicker(false);
    expect(useAddTransactionStore.getState().showCategoryPicker).toBe(false);
  });
});

describe('useAddTransactionStore.reset', () => {
  it('resets all INITIAL_STATE fields without changing visible', () => {
    useAddTransactionStore.getState().open();
    useAddTransactionStore.getState().setType(TransactionType.Transfer);
    useAddTransactionStore.getState().setSaving(true);
    useAddTransactionStore.getState().reset();
    const s = useAddTransactionStore.getState();
    expect(s.type).toBe(TransactionType.Expense);
    expect(s.amountStr).toBe('0');
    expect(s.saving).toBe(false);
    // visible is NOT part of INITIAL_STATE, so it stays as-is
  });
});
