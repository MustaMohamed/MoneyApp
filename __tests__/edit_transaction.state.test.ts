import { Currency, TransactionType } from '@/constants/enums';
import { useEditTransactionState } from '@/screens/transactions/transaction_form/edit_transaction.state';
import type { Transaction } from '@/database/entities/transaction.entity';

const NOW = '2026-05-01T12:00:00.000Z';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 150,
    currency: Currency.EGP,
    egp_amount: 150,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat_food',
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    commitment_payment_id: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

beforeEach(() => useEditTransactionState.getState().reset());

describe('useEditTransactionState initial state', () => {
  it('starts with every flag false', () => {
    const s = useEditTransactionState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});

describe('useEditTransactionState.open', () => {
  it('sets visible=true', () => {
    useEditTransactionState.getState().open(makeTx());
    expect(useEditTransactionState.getState().state.visible).toBe(true);
  });

  it('sets rateOverride=true when tx has an exchange_rate', () => {
    useEditTransactionState.getState().open(makeTx({ exchange_rate: 50 }));
    expect(useEditTransactionState.getState().state.rateOverride).toBe(true);
  });

  it('sets rateOverride=false when tx.exchange_rate is null', () => {
    useEditTransactionState.getState().open(makeTx({ exchange_rate: null }));
    expect(useEditTransactionState.getState().state.rateOverride).toBe(false);
  });
});

describe('useEditTransactionState.close', () => {
  it('resets every flag', () => {
    useEditTransactionState.setState({
      state: {
        visible: true,
        saving: true,
        showCategoryPicker: true,
        rateOverride: true,
      },
    });
    useEditTransactionState.getState().close();
    const s = useEditTransactionState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});

describe('useEditTransactionState setters', () => {
  it('setSaving toggles', () => {
    useEditTransactionState.getState().setSaving(true);
    expect(useEditTransactionState.getState().state.saving).toBe(true);
    useEditTransactionState.getState().setSaving(false);
    expect(useEditTransactionState.getState().state.saving).toBe(false);
  });

  it('setShowCategoryPicker toggles', () => {
    useEditTransactionState.getState().setShowCategoryPicker(true);
    expect(useEditTransactionState.getState().state.showCategoryPicker).toBe(true);
    useEditTransactionState.getState().setShowCategoryPicker(false);
    expect(useEditTransactionState.getState().state.showCategoryPicker).toBe(false);
  });

  it('setRateOverride toggles', () => {
    useEditTransactionState.getState().setRateOverride(true);
    expect(useEditTransactionState.getState().state.rateOverride).toBe(true);
    useEditTransactionState.getState().setRateOverride(false);
    expect(useEditTransactionState.getState().state.rateOverride).toBe(false);
  });
});

describe('useEditTransactionState.reset', () => {
  it('clears every flag', () => {
    useEditTransactionState.setState({
      state: {
        visible: true,
        saving: true,
        showCategoryPicker: true,
        rateOverride: true,
      },
    });
    useEditTransactionState.getState().reset();
    const s = useEditTransactionState.getState().state;
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});
