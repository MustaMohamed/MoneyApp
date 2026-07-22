import { act, render, renderHook } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

const mockSheetFrames: Array<{
  instanceId: number;
  isOpen: boolean;
  hasFooter: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseComplete: () => void;
}> = [];
let mockNextSheetInstanceId = 1;
const mockAddSession = jest.fn<React.ReactElement, [Record<string, unknown>]>((props) =>
  React.createElement(View, { testID: 'add-session', ...props }),
);
const mockEditSession = jest.fn<React.ReactElement, [Record<string, unknown>]>((props) =>
  React.createElement(View, { testID: 'edit-session', ...props }),
);
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/ui/button', () => ({
  Button: (props: object) => {
    const ReactLocal = require('react');
    const { View: RNView } = require('react-native');
    return ReactLocal.createElement(RNView, { testID: 'save-button', ...props });
  },
}));

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    isOpen,
    footer,
    onOpenChange,
    onCloseComplete,
    children,
  }: {
    isOpen: boolean;
    footer?: React.ReactNode;
    onOpenChange: (open: boolean) => void;
    onCloseComplete: () => void;
    children: React.ReactNode;
  }) => {
    const ReactLocal = require('react');
    const { View: RNView } = require('react-native');
    const instanceId = ReactLocal.useRef(mockNextSheetInstanceId++).current;
    mockSheetFrames.push({
      instanceId,
      isOpen,
      hasFooter: footer !== undefined,
      onOpenChange,
      onCloseComplete,
    });
    return ReactLocal.createElement(RNView, { testID: 'transaction-form-sheet' }, footer, children);
  },
}));

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/add_transaction_session',
  () => ({
    AddTransactionSession: (props: Record<string, unknown>) => mockAddSession(props),
  }),
  { virtual: true },
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/edit_transaction_session',
  () => ({
    EditTransactionSession: (props: Record<string, unknown>) => mockEditSession(props),
  }),
  { virtual: true },
);

import { TransactionFormHost } from '@/modules/transactions/screens/transactions/transaction_form';
import { useTransactionFormHost } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.hook';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';

function createTransaction(): Transaction {
  return {
    id: 'tx-1',
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

describe('TransactionFormHost', () => {
  beforeEach(() => {
    mockSheetFrames.length = 0;
    mockNextSheetInstanceId = 1;
    mockAddSession.mockClear();
    mockEditSession.mockClear();
    mockPush.mockClear();
    useTransactionFormState.getState().reset();
  });

  it('mounts one closed shell before any form is requested', () => {
    render(<TransactionFormHost />);

    expect(mockSheetFrames.at(-1)).toMatchObject({
      instanceId: 1,
      isOpen: false,
      hasFooter: false,
    });
    expect(mockAddSession).not.toHaveBeenCalled();
    expect(mockEditSession).not.toHaveBeenCalled();
  });

  it('opens Add through the existing shell instance', () => {
    render(<TransactionFormHost />);
    const closedInstance = mockSheetFrames.at(-1)?.instanceId;

    act(() => useTransactionFormState.getState().openAdd());

    expect(mockSheetFrames.at(-1)).toMatchObject({
      instanceId: closedInstance,
      isOpen: true,
      hasFooter: true,
    });
    expect(mockAddSession.mock.lastCall?.[0]).toMatchObject({ sessionId: 1 });
    expect(mockEditSession).not.toHaveBeenCalled();
  });

  it('keeps the session mounted until the shell finishes closing', () => {
    render(<TransactionFormHost />);
    act(() => useTransactionFormState.getState().openEdit(createTransaction()));
    const openFrame = mockSheetFrames.at(-1);

    act(() => openFrame?.onOpenChange(false));

    expect(mockSheetFrames.at(-1)).toMatchObject({
      instanceId: openFrame?.instanceId,
      isOpen: false,
    });
    expect(mockEditSession.mock.lastCall?.[0]).toMatchObject({ sessionId: 1 });

    act(() => mockSheetFrames.at(-1)?.onCloseComplete());

    expect(useTransactionFormState.getState().phase).toBe('closed');
    expect(mockEditSession).toHaveBeenCalledTimes(2);
  });

  it('renders the Save footer from matching session state', () => {
    render(<TransactionFormHost />);
    act(() => useTransactionFormState.getState().openAdd());
    const sessionId = useTransactionFormState.getState().sessionId;

    act(() =>
      useTransactionFormState.getState().publishFooter(sessionId, {
        visible: true,
        saving: false,
        disabled: true,
      }),
    );

    expect(mockSheetFrames.at(-1)).toMatchObject({ hasFooter: true });
  });

  it('ignores duplicate Save presses until the registered submit settles', async () => {
    useTransactionFormState.getState().openAdd();
    const sessionId = useTransactionFormState.getState().sessionId;
    useTransactionFormState.getState().publishFooter(sessionId, {
      visible: true,
      saving: false,
      disabled: false,
    });
    let resolveSubmit: () => void = () => {};
    const submit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const { result } = renderHook(() => useTransactionFormHost());
    act(() => result.current.registerSubmit(sessionId, submit));

    act(() => {
      result.current.handleSave();
      result.current.handleSave();
    });
    expect(submit).toHaveBeenCalledTimes(1);

    await act(async () => resolveSubmit());
    act(() => result.current.handleSave());
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale session save callback after another form opens', () => {
    const onEditSaved = jest.fn();
    render(<TransactionFormHost />);
    act(() => useTransactionFormState.getState().openEdit(createTransaction(), onEditSaved));
    const oldSessionId = useTransactionFormState.getState().sessionId;
    const staleOnSaved = mockEditSession.mock.lastCall?.[0].onSaved as
      | ((sessionId: number) => void)
      | undefined;

    act(() => useTransactionFormState.getState().openAdd());
    act(() => staleOnSaved?.(oldSessionId));

    expect(useTransactionFormState.getState()).toMatchObject({ mode: 'add', phase: 'open' });
    expect(onEditSaved).not.toHaveBeenCalled();
  });

  it('navigates to account creation only after the form finishes closing', () => {
    render(<TransactionFormHost />);
    act(() => useTransactionFormState.getState().openAdd());
    const sessionId = useTransactionFormState.getState().sessionId;
    const requestAccountCreation = mockAddSession.mock.lastCall?.[0].onRequestAccountCreation as
      | ((sessionId: number) => void)
      | undefined;

    act(() => requestAccountCreation?.(sessionId));
    expect(mockPush).not.toHaveBeenCalled();
    expect(useTransactionFormState.getState().phase).toBe('closing');

    act(() => mockSheetFrames.at(-1)?.onCloseComplete());
    expect(mockPush).toHaveBeenCalledWith('/accounts/add_account');
  });
});
