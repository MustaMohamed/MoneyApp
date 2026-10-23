import { act, renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { create } from 'zustand';

import { deferred } from '@/test_helpers/deferred';
import {
  type FormSessionFooter,
  type FormSessionHostSource,
  type FormSessionPhase,
  type FormSessionSubmit,
  type RegisterFormSessionSubmit,
  subscribeToAll,
  useFormSession,
  useFormSessionHost,
} from '@/utils/use_form_session.hook';

interface TestFooter {
  saving: boolean;
  errorMessage?: string;
}

interface SessionProps {
  sessionId: number;
  submit: FormSessionSubmit;
  footer: TestFooter;
}

const registerSubmit = jest.fn<
  ReturnType<RegisterFormSessionSubmit>,
  Parameters<RegisterFormSessionSubmit>
>();
const publishFooter = jest.fn<void, [number, TestFooter]>();

function makeSubmit() {
  return jest.fn<ReturnType<FormSessionSubmit>, []>().mockResolvedValue(undefined);
}

function mountSession(initialProps: SessionProps) {
  return renderHook(
    (props: SessionProps) =>
      useFormSession<TestFooter>({
        ...props,
        onRegisterSubmit: registerSubmit,
        publishFooter,
      }),
    { initialProps },
  );
}

function registeredFor(sessionId: number): FormSessionSubmit {
  const submit = registerSubmit.mock.calls.filter(([id]) => id === sessionId).at(-1)?.[1];
  if (!submit) throw new Error(`no submit registered for session ${sessionId}`);
  return submit;
}

describe('useFormSession', () => {
  beforeEach(() => {
    registerSubmit.mockReset();
    publishFooter.mockReset();
  });

  it('registers a submit for its session on mount and unregisters it on unmount', async () => {
    const submit = makeSubmit();

    const session = await mountSession({ sessionId: 1, submit, footer: { saving: false } });

    expect(registerSubmit).toHaveBeenCalledWith(1, expect.any(Function));
    await act(() => registeredFor(1)());
    expect(submit).toHaveBeenCalledTimes(1);

    await session.unmount();

    expect(registerSubmit).toHaveBeenLastCalledWith(1, undefined);
  });

  it('the registered submit calls the latest submit after a rerender', async () => {
    const first = makeSubmit();
    const latest = makeSubmit();
    const session = await mountSession({ sessionId: 1, submit: first, footer: { saving: false } });

    await session.rerender({ sessionId: 1, submit: latest, footer: { saving: false } });
    await act(() => registeredFor(1)());

    expect(latest).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('publishes its footer under its session on mount, and each change after', async () => {
    const submit = makeSubmit();

    const session = await mountSession({ sessionId: 1, submit, footer: { saving: true } });

    expect(publishFooter).toHaveBeenLastCalledWith(1, { saving: true });

    await session.rerender({
      sessionId: 1,
      submit,
      footer: { saving: false, errorMessage: 'Save failed' },
    });

    expect(publishFooter).toHaveBeenLastCalledWith(1, {
      saving: false,
      errorMessage: 'Save failed',
    });
  });

  it('publishes nothing on a rerender with an equal footer, and once when a field changes', async () => {
    const submit = makeSubmit();
    const session = await mountSession({ sessionId: 1, submit, footer: { saving: false } });
    expect(publishFooter).toHaveBeenCalledTimes(1);
    publishFooter.mockClear();

    await session.rerender({ sessionId: 1, submit, footer: { saving: false } });

    expect(publishFooter).not.toHaveBeenCalled();

    await session.rerender({ sessionId: 1, submit, footer: { saving: true } });

    expect(publishFooter).toHaveBeenCalledTimes(1);
    expect(publishFooter).toHaveBeenCalledWith(1, { saving: true });
  });

  it('on a new session id with an equal footer, moves the registration and publishes once under the new id', async () => {
    const submit = makeSubmit();
    const session = await mountSession({ sessionId: 1, submit, footer: { saving: false } });
    registerSubmit.mockClear();
    publishFooter.mockClear();

    await session.rerender({ sessionId: 2, submit, footer: { saving: false } });

    expect(registerSubmit.mock.calls).toEqual([
      [1, undefined],
      [2, expect.any(Function)],
    ]);
    expect(publishFooter).toHaveBeenCalledTimes(1);
    expect(publishFooter).toHaveBeenCalledWith(2, { saving: false });
  });
});

describe('subscribeToAll', () => {
  it('subscribes to every store and its one unsubscribe removes them all', () => {
    const removeFirst = jest.fn();
    const removeSecond = jest.fn();
    const first = { subscribe: jest.fn((_listener: () => void) => removeFirst) };
    const second = { subscribe: jest.fn((_listener: () => void) => removeSecond) };
    const onChange = jest.fn();

    const unsubscribe = subscribeToAll([first, second])(onChange);

    expect(first.subscribe).toHaveBeenCalledTimes(1);
    expect(second.subscribe).toHaveBeenCalledTimes(1);
    first.subscribe.mock.calls[0][0]();
    second.subscribe.mock.calls[0][0]();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(removeFirst).not.toHaveBeenCalled();
    expect(removeSecond).not.toHaveBeenCalled();

    unsubscribe();

    expect(removeFirst).toHaveBeenCalledTimes(1);
    expect(removeSecond).toHaveBeenCalledTimes(1);
  });
});

interface TestHostState {
  phase: FormSessionPhase;
  sessionId: number;
  footer: FormSessionFooter;
}

const CLOSED_HOST: TestHostState = { phase: 'closed', sessionId: 0, footer: { saving: false } };

const useTestHost = create<TestHostState>(() => CLOSED_HOST);
const useTestSession = create<{ saving: boolean }>(() => ({ saving: false }));

const requestClose = jest.fn((): boolean => {
  const { phase, footer } = useTestHost.getState();
  if (phase !== 'open') return true;
  if (footer.saving || useTestSession.getState().saving) return false;
  useTestHost.setState({ phase: 'closing' });
  return true;
});

const TEST_SOURCE: FormSessionHostSource = {
  read: () => {
    const { phase, sessionId, footer } = useTestHost.getState();
    return { phase, sessionId, footer, sessionSaving: useTestSession.getState().saving };
  },
  subscribe: subscribeToAll([useTestHost, useTestSession]),
  requestClose: () => requestClose(),
};

type HostResult = { current: ReturnType<typeof useFormSessionHost> };

let addListenerSpy: jest.SpiedFunction<typeof BackHandler.addEventListener>;
let removeMocks: jest.Mock[];

function pressBack(): boolean | null | undefined {
  const call = addListenerSpy.mock.calls.at(-1);
  if (call === undefined) throw new Error('no hardware back listener was added');
  expect(call[0]).toBe('hardwareBackPress');
  return call[1]({ type: 'hardwareBackPress', timeStamp: 0 });
}

function mountHost() {
  return renderHook(() => useFormSessionHost(TEST_SOURCE));
}

async function openSession(): Promise<number> {
  await act(() =>
    useTestHost.setState((state) => ({
      phase: 'open',
      sessionId: state.sessionId + 1,
      footer: { saving: false },
    })),
  );
  return useTestHost.getState().sessionId;
}

async function closeSession(): Promise<void> {
  await act(() => useTestHost.setState({ phase: 'closed', footer: { saving: false } }));
}

async function register(result: HostResult, sessionId: number, submit: FormSessionSubmit) {
  await act(() => result.current.registerSubmit(sessionId, submit));
}

async function save(result: HostResult): Promise<void> {
  await act(() => result.current.handleSave());
}

describe('useFormSessionHost', () => {
  beforeEach(() => {
    useTestHost.setState(CLOSED_HOST, true);
    useTestSession.setState({ saving: false });
    requestClose.mockClear();
    removeMocks = [];
    addListenerSpy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => {
      const remove = jest.fn();
      removeMocks.push(remove);
      return { remove };
    });
  });

  afterEach(() => {
    addListenerSpy.mockRestore();
  });

  it("runs the current session's registered submit once on Save", async () => {
    const { result } = await mountHost();
    const sessionId = await openSession();
    const submit = makeSubmit();
    await register(result, sessionId, submit);

    await save(result);

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      condition: 'the sheet is closing',
      apply: () => useTestHost.setState({ phase: 'closing' }),
      lift: () => useTestHost.setState({ phase: 'open' }),
    },
    {
      condition: 'its Save is disabled',
      apply: () => useTestHost.setState({ footer: { saving: false, disabled: true } }),
      lift: () => useTestHost.setState({ footer: { saving: false } }),
    },
    {
      condition: 'the footer reads saving',
      apply: () => useTestHost.setState({ footer: { saving: true } }),
      lift: () => useTestHost.setState({ footer: { saving: false } }),
    },
    {
      condition: 'the session saves',
      apply: () => useTestSession.setState({ saving: true }),
      lift: () => useTestSession.setState({ saving: false }),
    },
  ])(
    'runs nothing on a Save while $condition, and runs it once that lifts',
    async ({ apply, lift }) => {
      const { result } = await mountHost();
      const sessionId = await openSession();
      const submit = makeSubmit();
      await register(result, sessionId, submit);

      await act(() => apply());
      await save(result);

      expect(submit).not.toHaveBeenCalled();

      await act(() => lift());
      await save(result);

      expect(submit).toHaveBeenCalledTimes(1);
    },
  );

  it('runs nothing on a second Save before the first settles, and runs it after', async () => {
    const { result } = await mountHost();
    const sessionId = await openSession();
    const pending = deferred();
    const submit = jest.fn(() => pending.promise);
    await register(result, sessionId, submit);

    await act(() => {
      result.current.handleSave();
      result.current.handleSave();
    });

    expect(submit).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve());
    await save(result);

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('runs the submit on the next Save after a rejected one', async () => {
    const { result } = await mountHost();
    const sessionId = await openSession();
    const pending = deferred();
    const submit = jest
      .fn<ReturnType<FormSessionSubmit>, []>()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(undefined);
    await register(result, sessionId, submit);
    await save(result);
    await save(result);
    expect(submit).toHaveBeenCalledTimes(1);

    await act(async () => pending.reject(new Error('save failed')));
    await save(result);

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('runs the submit on the next Save after one that throws synchronously', async () => {
    const { result } = await mountHost();
    const sessionId = await openSession();
    const submit = jest
      .fn<ReturnType<FormSessionSubmit>, []>()
      .mockImplementationOnce(() => {
        throw new Error('save failed');
      })
      .mockResolvedValue(undefined);
    await register(result, sessionId, submit);

    await save(result);
    await save(result);

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('never runs a submit registered late under an older session id', async () => {
    const { result } = await mountHost();
    const olderSession = await openSession();
    await closeSession();
    const sessionId = await openSession();
    const current = makeSubmit();
    const stale = makeSubmit();
    await register(result, sessionId, current);
    await register(result, olderSession, stale);

    await save(result);

    expect(stale).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledTimes(1);
  });

  it('never runs the submit of a session the sheet has replaced without closing', async () => {
    const { result } = await mountHost();
    const olderSession = await openSession();
    const stale = makeSubmit();
    await register(result, olderSession, stale);
    await act(() => useTestHost.setState({ sessionId: olderSession + 1 }));

    await save(result);

    expect(stale).not.toHaveBeenCalled();
  });

  it('never runs a submit registered before a close and reopen', async () => {
    const { result } = await mountHost();
    const olderSession = await openSession();
    const stale = makeSubmit();
    await register(result, olderSession, stale);
    await closeSession();
    await openSession();

    await save(result);

    expect(stale).not.toHaveBeenCalled();
  });

  it("does not let a closed session's pending submit block the next session's Save", async () => {
    const { result } = await mountHost();
    const olderSession = await openSession();
    const olderPending = deferred();
    await register(
      result,
      olderSession,
      jest.fn(() => olderPending.promise),
    );
    await save(result);
    await closeSession();
    const sessionId = await openSession();
    const submit = makeSubmit();
    await register(result, sessionId, submit);

    await save(result);

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("keeps the newer session's in-flight mark when an older session's submit settles late", async () => {
    const { result } = await mountHost();
    const olderSession = await openSession();
    const olderPending = deferred();
    await register(
      result,
      olderSession,
      jest.fn(() => olderPending.promise),
    );
    await save(result);
    await closeSession();
    const sessionId = await openSession();
    const pending = deferred();
    const submit = jest.fn(() => pending.promise);
    await register(result, sessionId, submit);
    await save(result);
    expect(submit).toHaveBeenCalledTimes(1);

    await act(async () => olderPending.resolve());
    await save(result);

    expect(submit).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve());
    await save(result);

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('adds no back listener while closed, and while open back requests a close and is handled', async () => {
    await mountHost();
    expect(addListenerSpy).not.toHaveBeenCalled();

    await openSession();

    let handled: boolean | null | undefined;
    await act(() => {
      handled = pressBack();
    });
    expect(handled).toBe(true);
    expect(requestClose).toHaveBeenCalledTimes(1);
    expect(useTestHost.getState().phase).toBe('closing');
  });

  it('removes its back listener once the sheet has closed', async () => {
    await mountHost();
    await openSession();
    await act(() => {
      pressBack();
    });

    await closeSession();

    expect(removeMocks.length).toBeGreaterThan(0);
    for (const remove of removeMocks) expect(remove).toHaveBeenCalledTimes(1);
  });

  it('removes its back listener on unmount while a session is open', async () => {
    const host = await mountHost();
    await openSession();
    expect(removeMocks.length).toBeGreaterThan(0);

    await host.unmount();

    for (const remove of removeMocks) expect(remove).toHaveBeenCalledTimes(1);
  });

  it('reads isDismissable from the footer saving and the session saving as each store changes', async () => {
    const { result } = await mountHost();
    await openSession();
    expect(result.current.state.isDismissable).toBe(true);

    await act(() => useTestHost.setState({ footer: { saving: true } }));
    expect(result.current.state.isDismissable).toBe(false);

    await act(() => useTestHost.setState({ footer: { saving: false } }));
    expect(result.current.state.isDismissable).toBe(true);

    await act(() => useTestSession.setState({ saving: true }));
    expect(result.current.state.isDismissable).toBe(false);

    await act(() => useTestSession.setState({ saving: false }));
    expect(result.current.state.isDismissable).toBe(true);
  });

  it('requests a close on handleOpenChange(false) and handleClose, and not on handleOpenChange(true)', async () => {
    const { result } = await mountHost();
    await openSession();

    await act(() => result.current.handleOpenChange(true));
    expect(requestClose).not.toHaveBeenCalled();

    await act(() => result.current.handleOpenChange(false));
    expect(requestClose).toHaveBeenCalledTimes(1);

    await act(() => result.current.handleClose());
    expect(requestClose).toHaveBeenCalledTimes(2);
  });
});
