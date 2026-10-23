import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { BackHandler } from 'react-native';
import { shallow } from 'zustand/shallow';

export type FormSessionPhase = 'closed' | 'open' | 'closing';
// A submit sets its sheet's error field and never rejects: handleSave discards a rejection and only clears the in-flight mark.
export type FormSessionSubmit = () => Promise<void>;
export type RegisterFormSessionSubmit = (
  sessionId: number,
  submit: FormSessionSubmit | undefined,
) => void;

export interface FormSessionFooter {
  saving: boolean;
  disabled?: boolean;
}

export interface FormSessionSnapshot {
  phase: FormSessionPhase;
  sessionId: number;
  footer: FormSessionFooter;
  sessionSaving: boolean;
}

// Each host passes one module-level constant: a new identity re-subscribes every store and re-adds the Back listener.
export interface FormSessionHostSource {
  read: () => FormSessionSnapshot;
  subscribe: (onChange: () => void) => () => void;
  requestClose: () => boolean;
}

export interface FormSessionOptions<F extends object> {
  sessionId: number;
  submit: FormSessionSubmit;
  footer: F;
  onRegisterSubmit: RegisterFormSessionSubmit;
  publishFooter: (sessionId: number, footer: F) => void;
}

interface RegisteredSubmit {
  sessionId: number;
  submit: FormSessionSubmit;
}

export function subscribeToAll(
  stores: readonly { subscribe: (listener: () => void) => () => void }[],
): (onChange: () => void) => () => void {
  return (onChange) => {
    const unsubscribes = stores.map((store) => store.subscribe(onChange));
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  };
}

export function useFormSessionHost(source: FormSessionHostSource) {
  const hasSession = useSyncExternalStore(source.subscribe, () => source.read().phase !== 'closed');
  const isDismissable = useSyncExternalStore(source.subscribe, () => {
    const { footer, sessionSaving } = source.read();
    return !footer.saving && !sessionSaving;
  });
  const registeredRef = useRef<RegisteredSubmit | undefined>(undefined);
  const inFlightRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!hasSession) {
      registeredRef.current = undefined;
      inFlightRef.current = undefined;
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      source.requestClose();
      return true;
    });
    return () => subscription.remove();
  }, [hasSession, source]);

  const registerSubmit = useCallback<RegisterFormSessionSubmit>(
    (ownerSessionId, submit) => {
      if (ownerSessionId !== source.read().sessionId) return;
      registeredRef.current = submit ? { sessionId: ownerSessionId, submit } : undefined;
    },
    [source],
  );

  const handleSave = useCallback(() => {
    const current = source.read();
    const registered = registeredRef.current;
    // The footer still takes taps while the sheet animates closed; a Save there would write a dismissed draft.
    if (
      current.phase !== 'open' ||
      current.footer.disabled ||
      current.footer.saving ||
      current.sessionSaving ||
      inFlightRef.current === current.sessionId ||
      !registered ||
      registered.sessionId !== current.sessionId
    ) {
      return;
    }
    inFlightRef.current = current.sessionId;
    const settle = () => {
      if (inFlightRef.current === current.sessionId) inFlightRef.current = undefined;
    };
    let submitResult: Promise<void>;
    try {
      submitResult = registered.submit();
    } catch {
      settle();
      return;
    }
    void submitResult.then(settle, settle);
  }, [source]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) source.requestClose();
    },
    [source],
  );

  const handleClose = useCallback(() => {
    source.requestClose();
  }, [source]);

  return {
    state: { isDismissable },
    registerSubmit,
    handleSave,
    handleOpenChange,
    handleClose,
  };
}

export function useFormSession<F extends object>({
  sessionId,
  submit,
  footer,
  onRegisterSubmit,
  publishFooter,
}: FormSessionOptions<F>): void {
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const handleSubmit = useCallback(() => submitRef.current(), []);
  const publishedRef = useRef<{ sessionId: number; footer: F } | undefined>(undefined);

  useEffect(() => {
    onRegisterSubmit(sessionId, handleSubmit);
    return () => onRegisterSubmit(sessionId, undefined);
  }, [handleSubmit, onRegisterSubmit, sessionId]);

  // Each render passes a new footer object, so it publishes only on a new session or a changed field.
  useEffect(() => {
    const published = publishedRef.current;
    if (published?.sessionId === sessionId && shallow(published.footer, footer)) return;
    publishedRef.current = { sessionId, footer };
    publishFooter(sessionId, footer);
  });
}
