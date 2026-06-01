import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

import { TransactionType } from '@/constants/enums';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

type AddTransactionSignalState = {
  type: ReadonlySignal<TransactionType>;
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

class AddTransactionStore {
  private readonly type = signal(TransactionType.Expense);
  private readonly amountStr = signal('0');

  readonly state: AddTransactionSignalState = {
    type: this.type,
    amountStr: this.amountStr,
  };

  setType = (type: TransactionType) => {
    batch(() => {
      this.type.value = type;
      this.amountStr.value = '0';
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
      this.type.value = TransactionType.Expense;
      this.amountStr.value = '0';
    });
  };
}

const addTransactionStore = new AddTransactionStore();

export function useAddTransactionStore(): AddTransactionStore {
  return addTransactionStore;
}
