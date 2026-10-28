import { act, renderHook } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.state';
import { useCommitmentFormHost } from '@/modules/commitments/screens/commitments/commitment_form/commitment_form_host.hook';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/edit_commitment.state';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { type BackHandlerSpy, installBackHandlerSpy, pressBack } from '@/test_helpers/back_handler';
import { deferred } from '@/test_helpers/deferred';
import type { FormSessionSubmit } from '@/utils/use_form_session.hook';

type HostResult = { current: ReturnType<typeof useCommitmentFormHost> };

const host = () => useCommitmentFormHostState.getState();

let addListenerSpy: BackHandlerSpy;
let removeMocks: jest.Mock[];

function makeSubmit() {
  return jest.fn<ReturnType<FormSessionSubmit>, []>().mockResolvedValue(undefined);
}

async function register(result: HostResult, sessionId: number, submit: FormSessionSubmit) {
  await act(() => result.current.registerSubmit(sessionId, submit));
}

async function closeUnsaved(result: HostResult): Promise<void> {
  await act(() => result.current.handleOpenChange(false));
  await act(() => result.current.handleCloseComplete());
}

describe('useCommitmentFormHost', () => {
  beforeEach(() => {
    host().reset();
    useAddCommitmentState.getState().reset();
    useEditCommitmentState.getState().reset();
    ({ spy: addListenerSpy, removeMocks } = installBackHandlerSpy());
  });

  afterEach(() => {
    addListenerSpy.mockRestore();
  });

  it('adds no back listener and holds no session while closed', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());

    expect(host().phase).toBe('closed');
    expect(addListenerSpy).not.toHaveBeenCalled();
    expect(result.current.state.hasSession).toBe(false);
  });

  it("calls the current session's registered submit once on Save", async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const submit = makeSubmit();
    await register(result, host().sessionId, submit);

    await act(() => result.current.handleSave());

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('starts no second save before the first settles, and after a failed save the next Save starts one', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const pending = deferred();
    const submit = jest
      .fn<ReturnType<FormSessionSubmit>, []>()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(undefined);
    await register(result, host().sessionId, submit);

    await act(() => {
      result.current.handleSave();
      result.current.handleSave();
    });

    expect(submit).toHaveBeenCalledTimes(1);

    await act(async () => pending.reject(new Error('save failed')));
    await act(() => result.current.handleSave());

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('calls nothing on a Save while the sheet is closing', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const submit = makeSubmit();
    await register(result, host().sessionId, submit);
    await act(() => result.current.handleOpenChange(false));
    expect(host().phase).toBe('closing');

    await act(() => result.current.handleSave());

    expect(submit).not.toHaveBeenCalled();
  });

  it('calls nothing on a Save once the session has unregistered its submit', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const submit = makeSubmit();
    await register(result, host().sessionId, submit);
    await act(() => result.current.registerSubmit(host().sessionId, undefined));

    await act(() => result.current.handleSave());

    expect(submit).not.toHaveBeenCalled();
    expect(host().phase).toBe('open');
  });

  it('calls nothing on a Save while the footer reads saving', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const submit = makeSubmit();
    await register(result, host().sessionId, submit);
    await act(() => host().publishFooter(host().sessionId, { saving: true }));

    await act(() => result.current.handleSave());

    expect(submit).not.toHaveBeenCalled();
  });

  it('calls nothing on a Save while the add state saves and the footer has not caught up', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const submit = makeSubmit();
    await register(result, host().sessionId, submit);
    await act(() => useAddCommitmentState.setState({ saving: true }));
    expect(host().footer).toEqual({ saving: false });

    await act(() => result.current.handleSave());

    expect(submit).not.toHaveBeenCalled();
  });

  it('calls nothing on a Save while an edit entry saves and the footer has not caught up', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openEdit('c-1'));
    const submit = makeSubmit();
    await register(result, host().sessionId, submit);
    await act(() => {
      useEditCommitmentState.getState().claim('owner-1');
      useEditCommitmentState.getState().setSaving('owner-1', true);
    });
    expect(host().footer).toEqual({ saving: false });

    await act(() => result.current.handleSave());

    expect(submit).not.toHaveBeenCalled();
  });

  it('ignores a submit registered late by an older session', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const olderSession = host().sessionId;
    await closeUnsaved(result);
    await act(() => host().openAdd());
    expect(host().sessionId).toBe(olderSession + 1);
    const stale = makeSubmit();
    await register(result, olderSession, stale);

    await act(() => result.current.handleSave());

    expect(stale).not.toHaveBeenCalled();
  });

  it('drops the submit an older session registered once the sheet has closed', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const stale = makeSubmit();
    await register(result, host().sessionId, stale);
    await closeUnsaved(result);
    await act(() => host().openAdd());

    await act(() => result.current.handleSave());

    expect(stale).not.toHaveBeenCalled();
  });

  it('closes on hardware back, then removes its listener once closed', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());

    let handled: boolean | null | undefined;
    await act(() => {
      handled = pressBack(addListenerSpy);
    });
    expect(handled).toBe(true);
    expect(host().phase).toBe('closing');

    await act(() => result.current.handleCloseComplete());

    expect(host().phase).toBe('closed');
    expect(result.current.state.hasSession).toBe(false);
    expect(removeMocks.length).toBeGreaterThan(0);
    for (const remove of removeMocks) expect(remove).toHaveBeenCalledTimes(1);
  });

  it('is dismissable at rest under the add title, and a close request starts closing', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());

    expect(result.current.state.isOpen).toBe(true);
    expect(result.current.state.hasSession).toBe(true);
    expect(result.current.state.mode).toBe('add');
    expect(result.current.state.isDismissable).toBe(true);
    expect(result.current.state.title).toBe('Add commitment');

    await act(() => result.current.handleOpenChange(false));

    expect(host().phase).toBe('closing');
    expect(result.current.state.isOpen).toBe(false);
  });

  it('titles an edit session with the edit title and holds the commitment it was opened for', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());

    await act(() => host().openEdit('c-1'));

    expect(result.current.state.isOpen).toBe(true);
    expect(result.current.state.hasSession).toBe(true);
    expect(result.current.state.mode).toBe('edit');
    expect(result.current.state.editingCommitmentId).toBe('c-1');
    expect(result.current.state.title).toBe('Edit commitment');
  });

  it('reads saving and the save error from the footer the session publishes', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const sessionId = host().sessionId;
    expect(result.current.state.saving).toBe(false);
    expect(result.current.state.saveError).toBeUndefined();

    await act(() => host().publishFooter(sessionId, { saving: true }));

    expect(result.current.state.saving).toBe(true);
    expect(result.current.state.isDismissable).toBe(false);

    await act(() =>
      host().publishFooter(sessionId, {
        saving: false,
        errorMessage: Strings.commitmentsSaveError,
      }),
    );

    expect(result.current.state.saving).toBe(false);
    expect(result.current.state.saveError).toBe(Strings.commitmentsSaveError);
    expect(result.current.state.isDismissable).toBe(true);
  });

  it('refuses back and a close request while the add state saves, and closes once it lands', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const sessionId = host().sessionId;

    await act(() => useAddCommitmentState.getState().setSaving(true));
    expect(result.current.state.isDismissable).toBe(false);

    let handled: boolean | null | undefined;
    await act(() => {
      handled = pressBack(addListenerSpy);
    });
    expect(handled).toBe(true);
    expect(host().phase).toBe('open');
    await act(() => result.current.handleOpenChange(false));
    expect(host().phase).toBe('open');
    await act(() => result.current.handleClose());
    expect(host().phase).toBe('open');

    await act(() => useAddCommitmentState.getState().setSaving(false));
    await act(() => result.current.handleSaved(sessionId));

    expect(host().phase).toBe('closing');
  });

  it('follows the edit state for dismissal, back and the close button in edit mode', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openEdit('c-1'));
    expect(result.current.state.isDismissable).toBe(true);

    await act(() => {
      useEditCommitmentState.getState().claim('owner-1');
      useEditCommitmentState.getState().setSaving('owner-1', true);
    });

    expect(result.current.state.isDismissable).toBe(false);
    await act(() => {
      pressBack(addListenerSpy);
    });
    expect(host().phase).toBe('open');
    await act(() => result.current.handleClose());
    expect(host().phase).toBe('open');

    await act(() => useEditCommitmentState.getState().setSaving('owner-1', false));

    expect(result.current.state.isDismissable).toBe(true);
    await act(() => result.current.handleClose());
    expect(host().phase).toBe('closing');
  });

  describe('a landed save or deactivate', () => {
    const onSaved = jest.fn();
    const onDeactivated = jest.fn();

    beforeEach(() => {
      onSaved.mockReset();
      onDeactivated.mockReset();
    });

    it('closes on a save and runs only the onSaved of its landing', async () => {
      const { result } = await renderHook(() => useCommitmentFormHost());
      await act(() => host().openEdit('c-1', { onSaved, onDeactivated }));

      await act(() => result.current.handleSaved(host().sessionId));

      expect(host().phase).toBe('closing');
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onDeactivated).not.toHaveBeenCalled();
    });

    it('closes on a deactivate and runs only the onDeactivated of its landing', async () => {
      const { result } = await renderHook(() => useCommitmentFormHost());
      await act(() => host().openEdit('c-1', { onSaved, onDeactivated }));

      await act(() => result.current.handleDeactivated(host().sessionId));

      expect(host().phase).toBe('closing');
      expect(onDeactivated).toHaveBeenCalledTimes(1);
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('closes on a save from a session opened with no landing', async () => {
      const { result } = await renderHook(() => useCommitmentFormHost());
      await act(() => host().openEdit('c-1'));

      await act(() => result.current.handleSaved(host().sessionId));

      expect(host().phase).toBe('closing');
    });

    it.each(['handleSaved', 'handleDeactivated'] as const)(
      '%s from an older session neither closes the sheet nor runs a landing',
      async (handler) => {
        const olderLanding = { onSaved: jest.fn(), onDeactivated: jest.fn() };
        const { result } = await renderHook(() => useCommitmentFormHost());
        await act(() => host().openEdit('c-1', olderLanding));
        const olderSession = host().sessionId;
        await closeUnsaved(result);
        await act(() => host().openEdit('c-2', { onSaved, onDeactivated }));

        await act(() => result.current[handler](olderSession));

        expect(host().phase).toBe('open');
        expect(host().editingCommitmentId).toBe('c-2');
        expect(onSaved).not.toHaveBeenCalled();
        expect(onDeactivated).not.toHaveBeenCalled();
        expect(olderLanding.onSaved).not.toHaveBeenCalled();
        expect(olderLanding.onDeactivated).not.toHaveBeenCalled();
      },
    );
  });
});
