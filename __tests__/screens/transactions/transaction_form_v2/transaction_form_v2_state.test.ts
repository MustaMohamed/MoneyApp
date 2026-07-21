import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useTransactionFormV2State } from '@/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2.state';

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

describe('useTransactionFormV2State', () => {
  beforeEach(() => {
    useTransactionFormV2State.getState().reset();
  });

  it('opens Add atomically without a preparing phase', () => {
    useTransactionFormV2State.getState().openAdd();

    expect(useTransactionFormV2State.getState()).toMatchObject({
      mode: 'add',
      phase: 'open',
      sessionId: 1,
      editingTx: null,
      prerequisiteStatus: 'idle',
      footer: {
        visible: true,
        saving: false,
        disabled: true,
      },
    });
  });

  it('opens Edit with its target in the same state update', () => {
    const tx = createTransaction();

    useTransactionFormV2State.getState().openEdit(tx);

    expect(useTransactionFormV2State.getState()).toMatchObject({
      mode: 'edit',
      phase: 'open',
      sessionId: 1,
      editingTx: tx,
    });
  });

  it('blocks dismissal while the matching session is saving', () => {
    useTransactionFormV2State.getState().openAdd();
    const sessionId = useTransactionFormV2State.getState().sessionId;
    useTransactionFormV2State.getState().publishFooter(sessionId, {
      visible: true,
      saving: true,
      disabled: true,
    });

    expect(useTransactionFormV2State.getState().requestClose()).toBe(false);
    expect(useTransactionFormV2State.getState().phase).toBe('open');
  });

  it.each([
    ['add', () => useAddTransactionState.setState({ saving: true })],
    ['edit', () => useEditTransactionState.setState({ saving: true })],
  ] as const)('blocks %s dismissal before footer publication catches up', (mode, beginSaving) => {
    if (mode === 'add') {
      useTransactionFormV2State.getState().openAdd();
    } else {
      useTransactionFormV2State.getState().openEdit(createTransaction());
    }
    beginSaving();

    expect(useTransactionFormV2State.getState().footer.saving).toBe(false);
    expect(useTransactionFormV2State.getState().requestClose()).toBe(false);
    expect(useTransactionFormV2State.getState().phase).toBe('open');
  });

  it('retains closing content and ignores stale close completion', () => {
    useTransactionFormV2State.getState().openEdit(createTransaction());
    const editSession = useTransactionFormV2State.getState().sessionId;

    expect(useTransactionFormV2State.getState().requestClose()).toBe(true);
    expect(useTransactionFormV2State.getState().phase).toBe('closing');

    useTransactionFormV2State.getState().openAdd();
    useTransactionFormV2State.getState().completeClose(editSession);

    expect(useTransactionFormV2State.getState()).toMatchObject({
      mode: 'add',
      phase: 'open',
      sessionId: editSession + 1,
    });
  });

  it('starts one prerequisite request for each session generation', () => {
    useTransactionFormV2State.getState().openAdd();
    const { sessionId, prerequisiteGeneration } = useTransactionFormV2State.getState();

    expect(
      useTransactionFormV2State.getState().beginPrerequisites(sessionId, prerequisiteGeneration),
    ).toBe(true);
    expect(
      useTransactionFormV2State.getState().beginPrerequisites(sessionId, prerequisiteGeneration),
    ).toBe(false);

    useTransactionFormV2State.getState().completePrerequisites(sessionId, prerequisiteGeneration);
    expect(useTransactionFormV2State.getState().prerequisiteStatus).toBe('ready');
  });

  it('ignores stale prerequisite completion after retry or session replacement', () => {
    useTransactionFormV2State.getState().openAdd();
    const first = useTransactionFormV2State.getState();
    useTransactionFormV2State
      .getState()
      .beginPrerequisites(first.sessionId, first.prerequisiteGeneration);
    useTransactionFormV2State
      .getState()
      .failPrerequisites(first.sessionId, first.prerequisiteGeneration);
    useTransactionFormV2State.getState().retryPrerequisites();

    useTransactionFormV2State
      .getState()
      .completePrerequisites(first.sessionId, first.prerequisiteGeneration);
    expect(useTransactionFormV2State.getState().prerequisiteStatus).toBe('idle');

    const retry = useTransactionFormV2State.getState();
    useTransactionFormV2State
      .getState()
      .beginPrerequisites(retry.sessionId, retry.prerequisiteGeneration);
    useTransactionFormV2State.getState().openEdit(createTransaction('tx-2'));
    useTransactionFormV2State
      .getState()
      .failPrerequisites(retry.sessionId, retry.prerequisiteGeneration);

    expect(useTransactionFormV2State.getState()).toMatchObject({
      mode: 'edit',
      prerequisiteStatus: 'idle',
    });
  });
});
