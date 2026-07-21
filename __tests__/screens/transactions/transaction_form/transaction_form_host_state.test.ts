import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useTransactionFormHostState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';

function createTransaction(id = 'tx-1'): Transaction {
  return {
    id,
    type: TransactionType.Expense,
    amount: 125,
    currency: Currency.EGP,
    egp_amount: 125,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    revolving_balance_delta: null,
    account_id: 'account-1',
    to_account_id: null,
    category_id: 'category-1',
    budget_id: null,
    note: null,
    transaction_date: '2026-07-21',
    transaction_time: '12:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: '2026-07-21T12:00:00.000Z',
    updated_at: '2026-07-21T12:00:00.000Z',
  };
}

describe('useTransactionFormHostState', () => {
  beforeEach(() => {
    useAddTransactionState.getState().reset();
    useEditTransactionState.getState().reset();
    useTransactionFormHostState.getState().reset();
  });

  it('opens Add directly in a preparing session without routing', () => {
    useTransactionFormHostState.getState().openAdd();

    expect(useTransactionFormHostState.getState()).toMatchObject({
      mode: 'add',
      phase: 'preparing',
      sessionId: 1,
      editingTx: null,
    });
  });

  it('opens Edit with its target in the same session update', () => {
    const tx = createTransaction();

    useTransactionFormHostState.getState().openEdit(tx);

    expect(useTransactionFormHostState.getState()).toMatchObject({
      mode: 'edit',
      phase: 'preparing',
      sessionId: 1,
      editingTx: tx,
    });
  });

  it('presents only the current prepared session', () => {
    useTransactionFormHostState.getState().openAdd();
    const firstSession = useTransactionFormHostState.getState().sessionId;
    useTransactionFormHostState.getState().openEdit(createTransaction('tx-2'));
    const currentSession = useTransactionFormHostState.getState().sessionId;

    useTransactionFormHostState.getState().present(firstSession);
    expect(useTransactionFormHostState.getState().phase).toBe('preparing');

    useTransactionFormHostState.getState().present(currentSession);
    expect(useTransactionFormHostState.getState().phase).toBe('open');
  });

  it('keeps an active save from dismissing the form', () => {
    useTransactionFormHostState.getState().openAdd();
    useTransactionFormHostState
      .getState()
      .present(useTransactionFormHostState.getState().sessionId);
    useAddTransactionState.getState().setSaving(true);

    expect(useTransactionFormHostState.getState().requestClose()).toBe(false);
    expect(useTransactionFormHostState.getState().phase).toBe('open');
  });

  it('retains the session through closing and ignores stale completion', () => {
    useTransactionFormHostState.getState().openEdit(createTransaction());
    const closingSession = useTransactionFormHostState.getState().sessionId;
    useTransactionFormHostState.getState().present(closingSession);
    useTransactionFormHostState.getState().requestClose();

    expect(useTransactionFormHostState.getState()).toMatchObject({
      mode: 'edit',
      phase: 'closing',
      editingTx: { id: 'tx-1' },
    });

    useTransactionFormHostState.getState().openAdd();
    useTransactionFormHostState.getState().completeClose(closingSession);

    expect(useTransactionFormHostState.getState()).toMatchObject({
      mode: 'add',
      phase: 'preparing',
      editingTx: null,
    });
  });
});
