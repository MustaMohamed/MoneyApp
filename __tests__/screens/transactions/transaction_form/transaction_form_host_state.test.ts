import { AccountType, Currency, TransactionType } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';

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

function createAccount(id = 'account-1'): Account {
  return {
    id,
    name: 'Primary',
    type: AccountType.Bank,
    currency: Currency.EGP,
    opening_balance: 1_000,
    current_balance: 1_000,
    color: null,
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    is_archived: 0,
    balance_review_required: 0,
    sort_order: 0,
    created_at: '2026-07-21T12:00:00.000Z',
    updated_at: '2026-07-21T12:00:00.000Z',
  };
}

describe('useTransactionFormState', () => {
  beforeEach(() => {
    useTransactionFormState.getState().reset();
    useAccountStore.setState({ accounts: [], accountLookup: [], hasLoaded: false });
    useCategoryStore.setState({ categories: [], hasLoaded: false });
  });

  it('opens Add atomically without a preparing phase', () => {
    useTransactionFormState.getState().openAdd();

    expect(useTransactionFormState.getState()).toMatchObject({
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

    useTransactionFormState.getState().openEdit(tx);

    expect(useTransactionFormState.getState()).toMatchObject({
      mode: 'edit',
      phase: 'open',
      sessionId: 1,
      editingTx: tx,
    });
  });

  it('opens directly into ready state when cached Add prerequisites are available', () => {
    useAccountStore.setState({ hasLoaded: true });
    useCategoryStore.setState({ hasLoaded: true });

    useTransactionFormState.getState().openAdd();

    expect(useTransactionFormState.getState()).toMatchObject({
      prerequisiteStatus: 'ready',
      footer: {
        visible: false,
        saving: false,
        disabled: true,
      },
    });
  });

  it('opens directly into ready state when the cached Edit account is in lookup', () => {
    useAccountStore.setState({
      hasLoaded: true,
      accountLookup: [createAccount()],
    });
    useCategoryStore.setState({ hasLoaded: true });

    useTransactionFormState.getState().openEdit(createTransaction());

    expect(useTransactionFormState.getState()).toMatchObject({
      prerequisiteStatus: 'ready',
      footer: {
        visible: true,
        saving: false,
        disabled: false,
      },
    });
  });

  it('keeps Edit in prerequisite loading when its account is not cached', () => {
    useAccountStore.setState({ hasLoaded: true });
    useCategoryStore.setState({ hasLoaded: true });

    useTransactionFormState.getState().openEdit(createTransaction());

    expect(useTransactionFormState.getState()).toMatchObject({
      prerequisiteStatus: 'idle',
      footer: {
        visible: true,
        saving: false,
        disabled: true,
      },
    });
  });

  it('blocks dismissal while the matching session is saving', () => {
    useTransactionFormState.getState().openAdd();
    const sessionId = useTransactionFormState.getState().sessionId;
    useTransactionFormState.getState().publishFooter(sessionId, {
      visible: true,
      saving: true,
      disabled: true,
    });

    expect(useTransactionFormState.getState().requestClose()).toBe(false);
    expect(useTransactionFormState.getState().phase).toBe('open');
  });

  it('keeps the session open and restores actions after a recoverable save failure', () => {
    useTransactionFormState.getState().openAdd();
    const sessionId = useTransactionFormState.getState().sessionId;
    useTransactionFormState.getState().publishFooter(sessionId, {
      visible: true,
      saving: true,
      disabled: true,
    });

    useTransactionFormState.getState().publishFooter(sessionId, {
      visible: true,
      saving: false,
      disabled: false,
    });

    expect(useTransactionFormState.getState()).toMatchObject({
      phase: 'open',
      sessionId,
      footer: { visible: true, saving: false, disabled: false },
    });
  });

  it.each([
    ['add', () => useAddTransactionState.setState({ saving: true })],
    ['edit', () => useEditTransactionState.setState({ saving: true })],
  ] as const)('blocks %s dismissal before footer publication catches up', (mode, beginSaving) => {
    if (mode === 'add') {
      useTransactionFormState.getState().openAdd();
    } else {
      useTransactionFormState.getState().openEdit(createTransaction());
    }
    beginSaving();

    expect(useTransactionFormState.getState().footer.saving).toBe(false);
    expect(useTransactionFormState.getState().requestClose()).toBe(false);
    expect(useTransactionFormState.getState().phase).toBe('open');
  });

  it('retains closing content and ignores stale close completion', () => {
    useTransactionFormState.getState().openEdit(createTransaction());
    const editSession = useTransactionFormState.getState().sessionId;

    expect(useTransactionFormState.getState().requestClose()).toBe(true);
    expect(useTransactionFormState.getState().phase).toBe('closing');

    useTransactionFormState.getState().openAdd();
    useTransactionFormState.getState().completeClose(editSession);

    expect(useTransactionFormState.getState()).toMatchObject({
      mode: 'add',
      phase: 'open',
      sessionId: editSession + 1,
    });
  });

  it('ignores save completion from a replaced session', () => {
    useTransactionFormState.getState().openAdd();
    const addSession = useTransactionFormState.getState().sessionId;

    useTransactionFormState.getState().openEdit(createTransaction('tx-2'));
    const editSession = useTransactionFormState.getState().sessionId;

    expect(useTransactionFormState.getState().completeSave(addSession)).toBe(false);
    expect(useTransactionFormState.getState()).toMatchObject({
      mode: 'edit',
      phase: 'open',
      sessionId: editSession,
    });
    expect(useTransactionFormState.getState().completeSave(editSession)).toBe(true);
    expect(useTransactionFormState.getState().phase).toBe('closing');
  });

  it('returns account navigation only after the matching close settles', () => {
    useTransactionFormState.getState().openAdd();
    const sessionId = useTransactionFormState.getState().sessionId;

    expect(useTransactionFormState.getState().requestAccountCreation(sessionId)).toBe(true);
    expect(useTransactionFormState.getState()).toMatchObject({
      phase: 'closing',
      postCloseAction: 'addAccount',
    });

    expect(useTransactionFormState.getState().completeClose(sessionId)).toBe('addAccount');
    expect(useTransactionFormState.getState().phase).toBe('closed');
  });

  it('starts one prerequisite request for each session generation', () => {
    useTransactionFormState.getState().openAdd();
    const { sessionId, prerequisiteGeneration } = useTransactionFormState.getState();

    expect(
      useTransactionFormState.getState().beginPrerequisites(sessionId, prerequisiteGeneration),
    ).toBe(true);
    expect(
      useTransactionFormState.getState().beginPrerequisites(sessionId, prerequisiteGeneration),
    ).toBe(false);

    useTransactionFormState.getState().completePrerequisites(sessionId, prerequisiteGeneration);
    expect(useTransactionFormState.getState().prerequisiteStatus).toBe('ready');
  });

  it('ignores stale prerequisite completion after retry or session replacement', () => {
    useTransactionFormState.getState().openAdd();
    const first = useTransactionFormState.getState();
    useTransactionFormState
      .getState()
      .beginPrerequisites(first.sessionId, first.prerequisiteGeneration);
    useTransactionFormState
      .getState()
      .failPrerequisites(first.sessionId, first.prerequisiteGeneration);
    useTransactionFormState.getState().retryPrerequisites();

    useTransactionFormState
      .getState()
      .completePrerequisites(first.sessionId, first.prerequisiteGeneration);
    expect(useTransactionFormState.getState().prerequisiteStatus).toBe('idle');

    const retry = useTransactionFormState.getState();
    useTransactionFormState
      .getState()
      .beginPrerequisites(retry.sessionId, retry.prerequisiteGeneration);
    useTransactionFormState.getState().openEdit(createTransaction('tx-2'));
    useTransactionFormState
      .getState()
      .failPrerequisites(retry.sessionId, retry.prerequisiteGeneration);

    expect(useTransactionFormState.getState()).toMatchObject({
      mode: 'edit',
      prerequisiteStatus: 'idle',
    });
  });
});
