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
  React.createElement(View, { testID: 'add-v2-session', ...props }),
);
const mockEditSession = jest.fn<React.ReactElement, [Record<string, unknown>]>((props) =>
  React.createElement(View, { testID: 'edit-v2-session', ...props }),
);

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
    return ReactLocal.createElement(RNView, { testID: 'v2-sheet' }, footer, children);
  },
}));

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form_v2/add_transaction_session',
  () => ({
    AddTransactionV2Session: (props: Record<string, unknown>) => mockAddSession(props),
  }),
  { virtual: true },
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form_v2/edit_transaction_session',
  () => ({
    EditTransactionV2Session: (props: Record<string, unknown>) => mockEditSession(props),
  }),
  { virtual: true },
);

import { TransactionFormV2Host } from '@/modules/transactions/screens/transactions/transaction_form_v2';
import { useTransactionFormV2Host } from '@/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2.hook';
import { useTransactionFormV2State } from '@/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2.state';

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

describe('TransactionFormV2Host', () => {
  beforeEach(() => {
    mockSheetFrames.length = 0;
    mockNextSheetInstanceId = 1;
    mockAddSession.mockClear();
    mockEditSession.mockClear();
    useTransactionFormV2State.getState().reset();
  });

  it('mounts one closed shell before any form is requested', () => {
    render(<TransactionFormV2Host />);

    expect(mockSheetFrames.at(-1)).toMatchObject({
      instanceId: 1,
      isOpen: false,
      hasFooter: false,
    });
    expect(mockAddSession).not.toHaveBeenCalled();
    expect(mockEditSession).not.toHaveBeenCalled();
  });

  it('opens Add through the existing shell instance', () => {
    render(<TransactionFormV2Host />);
    const closedInstance = mockSheetFrames.at(-1)?.instanceId;

    act(() => useTransactionFormV2State.getState().openAdd());

    expect(mockSheetFrames.at(-1)).toMatchObject({
      instanceId: closedInstance,
      isOpen: true,
      hasFooter: true,
    });
    expect(mockAddSession.mock.lastCall?.[0]).toMatchObject({ sessionId: 1 });
    expect(mockEditSession).not.toHaveBeenCalled();
  });

  it('keeps the session mounted until the shell finishes closing', () => {
    render(<TransactionFormV2Host />);
    act(() => useTransactionFormV2State.getState().openEdit(createTransaction()));
    const openFrame = mockSheetFrames.at(-1);

    act(() => openFrame?.onOpenChange(false));

    expect(mockSheetFrames.at(-1)).toMatchObject({
      instanceId: openFrame?.instanceId,
      isOpen: false,
    });
    expect(mockEditSession.mock.lastCall?.[0]).toMatchObject({ sessionId: 1 });

    act(() => mockSheetFrames.at(-1)?.onCloseComplete());

    expect(useTransactionFormV2State.getState().phase).toBe('closed');
    expect(mockEditSession).toHaveBeenCalledTimes(2);
  });

  it('renders the Save footer from matching session state', () => {
    render(<TransactionFormV2Host />);
    act(() => useTransactionFormV2State.getState().openAdd());
    const sessionId = useTransactionFormV2State.getState().sessionId;

    act(() =>
      useTransactionFormV2State.getState().publishFooter(sessionId, {
        visible: true,
        saving: false,
        disabled: true,
      }),
    );

    expect(mockSheetFrames.at(-1)).toMatchObject({ hasFooter: true });
  });

  it('ignores duplicate Save presses until the registered submit settles', async () => {
    useTransactionFormV2State.getState().openAdd();
    const sessionId = useTransactionFormV2State.getState().sessionId;
    useTransactionFormV2State.getState().publishFooter(sessionId, {
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
    const { result } = renderHook(() => useTransactionFormV2Host());
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
});
