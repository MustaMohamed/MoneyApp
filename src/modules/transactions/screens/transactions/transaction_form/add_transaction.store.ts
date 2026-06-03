import { batch, signal } from '@preact/signals-react';

import { TransactionType } from '@/constants/enums';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

const type = signal<TransactionType>(TransactionType.Expense);
const amountStr = signal('0');

function setType(next: TransactionType): void {
  batch(() => {
    type.value = next;
    amountStr.value = '0';
  });
}

function setAmountStr(value: string): void {
  amountStr.value = value;
}

function handleNumpad(action: NumpadAction, value?: string): void {
  const prev = amountStr.value;
  if (action === 'backspace') {
    amountStr.value = prev.length <= 1 ? '0' : prev.slice(0, -1);
    return;
  }
  if (action === 'decimal') {
    amountStr.value = prev.includes('.') ? prev : `${prev}.`;
    return;
  }

  const digit = value ?? '';
  if (prev === '0') {
    amountStr.value = digit === '0' ? '0' : digit;
    return;
  }
  if (prev.includes('.')) {
    const parts = prev.split('.');
    if (parts[1].length >= 2) return;
  }
  amountStr.value = prev + digit;
}

function reset(): void {
  batch(() => {
    type.value = TransactionType.Expense;
    amountStr.value = '0';
  });
}

export function useAddTransactionStore() {
  return {
    state: {
      type,
      amountStr,
    },
    setType,
    setAmountStr,
    handleNumpad,
    reset,
  };
}
