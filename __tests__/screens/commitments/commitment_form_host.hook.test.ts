import { act, renderHook } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { NO_STOP_COUNTS } from '@/modules/commitments/domain/payment_state';
import { NO_SETTLED_DUE_DATES } from '@/modules/commitments/screens/commitments/commitment_form.helpers';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/add_commitment.state';
import { useCommitmentFormHost } from '@/modules/commitments/screens/commitments/commitment_form/commitment_form_host.hook';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/edit_commitment.state';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { type BackHandlerSpy, installBackHandlerSpy, pressBack } from '@/test_helpers/back_handler';
import { makeTestCommitment } from '@/test_helpers/commitment';
import { deferred } from '@/test_helpers/deferred';
import type { FormSessionSubmit } from '@/utils/use_form_session.hook';

const mockToast = { show: jest.fn() };

// The wrapper, not HeroUI, so `show` sees exactly what the hook passed.
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: mockToast, isToastVisible: false }),
}));

const rent = makeTestCommitment({ id: 'c-1' });
const gym = makeTestCommitment({ id: 'c-2' });

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
    mockToast.show.mockClear();
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
    await act(() => host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS));
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

    await act(() => host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS));

    expect(result.current.state.isOpen).toBe(true);
    expect(result.current.state.hasSession).toBe(true);
    expect(result.current.state.mode).toBe('edit');
    expect(result.current.state.editingCommitment).toBe(rent);
    expect(result.current.state.title).toBe('Edit commitment');
  });

  it('mirrors the settled due dates the host holds for an edit, and none after it closes (MA-280)', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    expect(result.current.state.editingSettledDueDates).toEqual([]);

    await act(() => host().openEdit(rent, ['2026-08-20', '2026-09-20'], undefined, NO_STOP_COUNTS));

    expect(result.current.state.editingSettledDueDates).toEqual(['2026-08-20', '2026-09-20']);

    await closeUnsaved(result);

    expect(result.current.state.editingSettledDueDates).toEqual([]);
  });

  it('reads saving, the track error line and its footnote from the footer the session publishes', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    const sessionId = host().sessionId;
    expect(result.current.state.saving).toBe(false);
    expect(result.current.state.statusMessage).toBeUndefined();
    expect(result.current.state.statusFootnote).toBeUndefined();

    await act(() => host().publishFooter(sessionId, { saving: true }));

    expect(result.current.state.saving).toBe(true);
    expect(result.current.state.isDismissable).toBe(false);

    await act(() =>
      host().publishFooter(sessionId, {
        saving: false,
        errorMessage: Strings.commitmentsSaveError,
        footnote: 'First payment due Sun 1 Nov.',
      }),
    );

    expect(result.current.state.saving).toBe(false);
    expect(result.current.state.statusMessage).toBe(Strings.commitmentsSaveError);
    expect(result.current.state.statusFootnote).toBe('First payment due Sun 1 Nov.');
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

    await act(() => useAddCommitmentState.getState().setSaving(false));
    await act(() => result.current.handleSaved(sessionId));

    expect(host().phase).toBe('closing');
  });

  it('follows the edit state for dismissal, back and a close request in edit mode', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS));
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
    await act(() => result.current.handleOpenChange(false));
    expect(host().phase).toBe('open');

    await act(() => useEditCommitmentState.getState().setSaving('owner-1', false));

    expect(result.current.state.isDismissable).toBe(true);
    await act(() => result.current.handleOpenChange(false));
    expect(host().phase).toBe('closing');
  });

  describe('a landed save or Stop', () => {
    const onSaved = jest.fn();
    const onStopped = jest.fn();

    beforeEach(() => {
      onSaved.mockReset();
      onStopped.mockReset();
    });

    it('closes on a save and runs only the onSaved of its landing', async () => {
      const { result } = await renderHook(() => useCommitmentFormHost());
      await act(() =>
        host().openEdit(rent, NO_SETTLED_DUE_DATES, { onSaved, onStopped }, NO_STOP_COUNTS),
      );

      await act(() => result.current.handleSaved(host().sessionId));

      expect(host().phase).toBe('closing');
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onStopped).not.toHaveBeenCalled();
    });

    it('closes on a Stop and runs only the onStopped of its landing, once the sheet has closed, with no toast of its own', async () => {
      const { result } = await renderHook(() => useCommitmentFormHost());
      await act(() =>
        host().openEdit(rent, NO_SETTLED_DUE_DATES, { onSaved, onStopped }, NO_STOP_COUNTS),
      );

      await act(() => result.current.handleStopped(host().sessionId));

      expect(host().phase).toBe('closing');
      expect(onStopped).not.toHaveBeenCalled();

      await act(() => result.current.handleCloseComplete());

      expect(host().phase).toBe('closed');
      expect(onStopped).toHaveBeenCalledTimes(1);
      expect(onSaved).not.toHaveBeenCalled();
      expect(mockToast.show).not.toHaveBeenCalled();
    });

    it('closes on a save from a session opened with no landing', async () => {
      const { result } = await renderHook(() => useCommitmentFormHost());
      await act(() => host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS));

      await act(() => result.current.handleSaved(host().sessionId));

      expect(host().phase).toBe('closing');
    });

    it.each(['handleSaved', 'handleStopped'] as const)(
      '%s from an older session neither closes the sheet nor runs a landing',
      async (handler) => {
        const olderLanding = { onSaved: jest.fn(), onStopped: jest.fn() };
        const { result } = await renderHook(() => useCommitmentFormHost());
        await act(() => host().openEdit(rent, NO_SETTLED_DUE_DATES, olderLanding, NO_STOP_COUNTS));
        const olderSession = host().sessionId;
        await closeUnsaved(result);
        await act(() =>
          host().openEdit(gym, NO_SETTLED_DUE_DATES, { onSaved, onStopped }, NO_STOP_COUNTS),
        );

        await act(() => result.current[handler](olderSession));
        await act(() => result.current.handleCloseComplete());

        expect(host().phase).toBe('open');
        expect(host().editingCommitment).toBe(gym);
        expect(onSaved).not.toHaveBeenCalled();
        expect(onStopped).not.toHaveBeenCalled();
        expect(olderLanding.onSaved).not.toHaveBeenCalled();
        expect(olderLanding.onStopped).not.toHaveBeenCalled();
      },
    );
  });

  describe('the saved toast (MA-256)', () => {
    it.each([
      ['Commitment added', () => host().openAdd()],
      [
        'Commitment updated',
        () => host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS),
      ],
    ])('shows %s once, after the sheet has closed', async (label, open) => {
      const { result } = await renderHook(() => useCommitmentFormHost());
      await act(open);

      await act(() => result.current.handleSaved(host().sessionId));

      expect(host().phase).toBe('closing');
      expect(mockToast.show).not.toHaveBeenCalled();

      await act(() => result.current.handleCloseComplete());

      expect(host().phase).toBe('closed');
      expect(mockToast.show).toHaveBeenCalledTimes(1);
      expect(mockToast.show).toHaveBeenCalledWith({ label, variant: 'success' });
    });

    it('shows nothing after a Stop or an unsaved close, and one after the next saved edit', async () => {
      const { result } = await renderHook(() => useCommitmentFormHost());
      await act(() => host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS));
      await act(() => result.current.handleStopped(host().sessionId));
      await act(() => result.current.handleCloseComplete());

      expect(host().phase).toBe('closed');
      expect(mockToast.show).not.toHaveBeenCalled();

      await act(() => host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS));
      await closeUnsaved(result);

      expect(mockToast.show).not.toHaveBeenCalled();

      await act(() => host().openEdit(rent, NO_SETTLED_DUE_DATES, undefined, NO_STOP_COUNTS));
      await act(() => result.current.handleSaved(host().sessionId));
      await act(() => result.current.handleCloseComplete());

      expect(mockToast.show).toHaveBeenCalledTimes(1);
      expect(mockToast.show).toHaveBeenCalledWith({
        label: 'Commitment updated',
        variant: 'success',
      });
    });
  });
});
