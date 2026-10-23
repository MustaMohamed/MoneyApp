import { act, renderHook } from '@testing-library/react-native';

import type {
  CommitmentFormSubmit,
  RegisterCommitmentFormSubmit,
} from '@/modules/commitments/screens/commitments/commitment_form/commitment_form_host.hook';
import { useCommitmentFormSession } from '@/modules/commitments/screens/commitments/commitment_form/commitment_form_session.hook';
import {
  type CommitmentFormFooterState,
  useCommitmentFormHostState,
} from '@/modules/commitments/store/commitment_form_host.state';

const host = () => useCommitmentFormHostState.getState();

interface SessionProps {
  sessionId: number;
  submit: CommitmentFormSubmit;
  footer: CommitmentFormFooterState;
}

const registerSubmit = jest.fn<
  ReturnType<RegisterCommitmentFormSubmit>,
  Parameters<RegisterCommitmentFormSubmit>
>();

function mountSession(initialProps: SessionProps) {
  return renderHook(
    (props: SessionProps) =>
      useCommitmentFormSession({ ...props, onRegisterSubmit: registerSubmit }),
    { initialProps },
  );
}

function registeredFor(sessionId: number): CommitmentFormSubmit {
  const submit = registerSubmit.mock.calls.filter(([id]) => id === sessionId).at(-1)?.[1];
  if (!submit) throw new Error(`no submit registered for session ${sessionId}`);
  return submit;
}

describe('useCommitmentFormSession', () => {
  beforeEach(() => {
    registerSubmit.mockReset();
    host().reset();
  });

  it('registers a submit for its session on mount and unregisters it on unmount', async () => {
    host().openAdd();
    const submit = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

    const session = await mountSession({ sessionId: 1, submit, footer: { saving: false } });

    expect(registerSubmit).toHaveBeenCalledWith(1, expect.any(Function));
    await act(() => registeredFor(1)());
    expect(submit).toHaveBeenCalledTimes(1);

    await session.unmount();

    expect(registerSubmit).toHaveBeenLastCalledWith(1, undefined);
  });

  it('the registered submit calls the latest submit after a rerender', async () => {
    host().openAdd();
    const first = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const latest = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const session = await mountSession({ sessionId: 1, submit: first, footer: { saving: false } });

    await session.rerender({ sessionId: 1, submit: latest, footer: { saving: false } });
    await act(() => registeredFor(1)());

    expect(latest).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('publishes its footer to the host while its session is open, and each change after', async () => {
    host().openEdit('c-1');
    const submit = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

    const session = await mountSession({ sessionId: 1, submit, footer: { saving: true } });

    expect(host().footer).toEqual({ saving: true });

    await session.rerender({
      sessionId: 1,
      submit,
      footer: { saving: false, errorMessage: 'Save failed' },
    });

    expect(host().footer).toEqual({ saving: false, errorMessage: 'Save failed' });
  });

  it('a footer from an older session changes nothing on the host', async () => {
    host().openAdd();
    host().requestClose();
    host().completeClose(1);
    host().openEdit('c-1');
    const submit = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

    await mountSession({
      sessionId: 1,
      submit,
      footer: { saving: true, errorMessage: 'stale' },
    });

    expect(host().sessionId).toBe(2);
    expect(host().footer).toEqual({ saving: false });
  });
});
