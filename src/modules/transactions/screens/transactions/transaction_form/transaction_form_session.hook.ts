import { useCallback, useEffect, useRef } from 'react';

import type {
  RegisterTransactionFormSubmit,
  TransactionFormSubmit,
} from './transaction_form_host.hook';
import {
  type TransactionFormFooterState,
  useTransactionFormState,
} from './transaction_form_host.state';

interface TransactionFormSessionOptions {
  sessionId: number;
  submit: TransactionFormSubmit;
  footer: TransactionFormFooterState;
  onRegisterSubmit: RegisterTransactionFormSubmit;
}

export function useTransactionFormSession({
  sessionId,
  submit,
  footer,
  onRegisterSubmit,
}: TransactionFormSessionOptions): void {
  const publishFooter = useTransactionFormState.getState().publishFooter;
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const handleSubmit = useCallback(() => submitRef.current(), []);
  const { visible, saving, disabled } = footer;

  useEffect(() => {
    onRegisterSubmit(sessionId, handleSubmit);
    return () => onRegisterSubmit(sessionId, undefined);
  }, [handleSubmit, onRegisterSubmit, sessionId]);

  useEffect(() => {
    publishFooter(sessionId, { visible, saving, disabled });
  }, [disabled, publishFooter, saving, sessionId, visible]);
}
