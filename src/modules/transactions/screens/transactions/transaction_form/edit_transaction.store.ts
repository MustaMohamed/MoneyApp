import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

type EditTransactionSignalState = {
  editingTx: ReadonlySignal<Transaction | null>;
  amountStr: ReadonlySignal<string>;
};

function nextNumpadAmount(prev: string, action: NumpadAction, value?: string): string {
  if (action === 'backspace') {
    return prev.length <= 1 ? '0' : prev.slice(0, -1);
  }
  if (action === 'decimal') {
    return prev.includes('.') ? prev : `${prev}.`;
  }
  const digit = value ?? '';
  if (prev === '0') {
    return digit === '0' ? '0' : digit;
  }
  if (prev.includes('.')) {
    const parts = prev.split('.');
    if (parts[1].length >= 2) return prev;
  }
  return prev + digit;
}

class EditTransactionStore {
  private readonly editingTx = signal<Transaction | null>(null);
  private readonly amountStr = signal('0');

  readonly state: EditTransactionSignalState = {
    editingTx: this.editingTx,
    amountStr: this.amountStr,
  };

  loadFromTx = (tx: Transaction) => {
    batch(() => {
      this.editingTx.value = tx;
      this.amountStr.value = String(tx.amount);
    });
  };

  setAmountStr = (value: string) => {
    this.amountStr.value = value;
  };

  handleNumpad = (action: NumpadAction, value?: string) => {
    this.amountStr.value = nextNumpadAmount(this.amountStr.value, action, value);
  };

  reset = () => {
    batch(() => {
      this.editingTx.value = null;
      this.amountStr.value = '0';
    });
  };
}

const editTransactionStore = new EditTransactionStore();

export function useEditTransactionStore(): EditTransactionStore {
  return editTransactionStore;
}
