import { useCallback, useEffect, useRef } from 'react';

import type {
  RegisterTransactionFormV2Submit,
  TransactionFormV2Submit,
} from './transaction_form_v2.hook';
import {
  type TransactionFormV2FooterState,
  useTransactionFormV2State,
} from './transaction_form_v2.state';

interface TransactionFormV2SessionOptions {
  sessionId: number;
  submit: TransactionFormV2Submit;
  footer: TransactionFormV2FooterState;
  onRegisterSubmit: RegisterTransactionFormV2Submit;
}

export function useTransactionFormV2Session({
  sessionId,
  submit,
  footer,
  onRegisterSubmit,
}: TransactionFormV2SessionOptions): void {
  const publishFooter = useTransactionFormV2State.getState().publishFooter;
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
