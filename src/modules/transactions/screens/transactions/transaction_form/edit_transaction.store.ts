import { batch, signal } from '@preact/signals-react';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

interface EditTransactionStoreState {
  editingTx: typeof editingTx;
  amountStr: typeof amountStr;
}

interface EditTransactionStoreActions {
  loadFromTx: (tx: Transaction) => void;
  /**
   * Direct amount setter for the editable AmountHero TextInput (system
   * decimal-pad keyboard). Replaces the custom numpad UI; `handleNumpad`
   * stays for legacy hook tests but is no longer wired to any component.
   */
  setAmountStr: (value: string) => void;
  handleNumpad: (action: 'digit' | 'decimal' | 'backspace', value?: string) => void;
  reset: () => void;
}

const editingTx = signal<Transaction | null>(null);
const amountStr = signal('0');

function loadFromTx(tx: Transaction): void {
  batch(() => {
    editingTx.value = tx;
    amountStr.value = String(tx.amount);
  });
}

function setAmountStr(value: string): void {
  amountStr.value = value;
}

function handleNumpad(action: 'digit' | 'decimal' | 'backspace', value?: string): void {
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
    editingTx.value = null;
    amountStr.value = '0';
  });
}

export function useEditTransactionStore(): {
  state: EditTransactionStoreState;
} & EditTransactionStoreActions {
  return {
    state: {
      editingTx,
      amountStr,
    },
    loadFromTx,
    setAmountStr,
    handleNumpad,
    reset,
  };
}
