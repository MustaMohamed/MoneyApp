import { useCallback, useEffect, useRef } from 'react';

import {
  type CommitmentFormFooterState,
  useCommitmentFormHostState,
} from '@/modules/commitments/store/commitment_form_host.state';

import type {
  CommitmentFormSubmit,
  RegisterCommitmentFormSubmit,
} from './commitment_form_host.hook';

interface CommitmentFormSessionOptions {
  sessionId: number;
  submit: CommitmentFormSubmit;
  footer: CommitmentFormFooterState;
  onRegisterSubmit: RegisterCommitmentFormSubmit;
}

export function useCommitmentFormSession({
  sessionId,
  submit,
  footer,
  onRegisterSubmit,
}: CommitmentFormSessionOptions): void {
  const publishFooter = useCommitmentFormHostState.getState().publishFooter;
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const handleSubmit = useCallback(() => submitRef.current(), []);
  const { saving, errorMessage } = footer;

  useEffect(() => {
    onRegisterSubmit(sessionId, handleSubmit);
    return () => onRegisterSubmit(sessionId, undefined);
  }, [handleSubmit, onRegisterSubmit, sessionId]);

  useEffect(() => {
    publishFooter(sessionId, { saving, errorMessage });
  }, [errorMessage, publishFooter, saving, sessionId]);
}
