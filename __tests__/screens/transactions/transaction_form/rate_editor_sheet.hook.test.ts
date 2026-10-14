import { act, renderHook } from '@testing-library/react-native';
import type { TextInput } from 'react-native';

import { Strings } from '@/constants/strings';
import {
  useRateEditor,
  useRateEditorFocus,
} from '@/modules/transactions/screens/transactions/transaction_form/components/rate_editor_sheet.hook';
import { useRateEditorSheetState } from '@/modules/transactions/screens/transactions/transaction_form/components/rate_editor_sheet.state';

const ADD_OWNER = 'add-session';
const EDIT_OWNER = 'edit-session';

function storeFields() {
  const { activeOwnerId, isOpen, draft, error } = useRateEditorSheetState.getState();
  return { activeOwnerId, isOpen, draft, error };
}

async function mountEditor(ownerId: string, value: string, commits: boolean) {
  const onCommit = jest.fn().mockReturnValue(commits);
  const { result, unmount } = await renderHook(() => useRateEditor(ownerId, value, onCommit));
  return { result, unmount, onCommit };
}

beforeEach(() => {
  useRateEditorSheetState.getState().reset();
});

describe('useRateEditor', () => {
  it('opens on the rate in force: open() reads isOpen true and the draft equal to value', async () => {
    const { result } = await mountEditor(ADD_OWNER, '52.137035', true);
    expect(result.current.state.isOpen).toBe(false);

    await act(() => result.current.open());

    expect(result.current.state).toEqual({ isOpen: true, draft: '52.137035', error: undefined });
  });

  it.each(['', '0', '-5', '48.', '50abc'])(
    'stays open with the one message when Done on %p is refused',
    async (text) => {
      const { result, onCommit } = await mountEditor(ADD_OWNER, '50', false);
      await act(() => result.current.open());
      await act(() => result.current.setDraft(text));

      await act(() => result.current.done());

      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith(text);
      expect(result.current.state).toEqual({
        isOpen: true,
        draft: text,
        error: Strings.addTxErrRateInvalid,
      });
    },
  );

  it.each(['48.', '0', '0.0'])(
    'clears the message when %p is typed after a refused Done, and checks nothing until the next Done',
    async (text) => {
      const { result, onCommit } = await mountEditor(ADD_OWNER, '50', false);
      await act(() => result.current.open());
      await act(() => result.current.setDraft('50abc'));
      await act(() => result.current.done());
      expect(result.current.state.error).toBe(Strings.addTxErrRateInvalid);

      await act(() => result.current.setDraft(text));

      expect(result.current.state).toEqual({ isOpen: true, draft: text, error: undefined });
      expect(onCommit).toHaveBeenCalledTimes(1);
    },
  );

  it('calls onCommit once with the draft and closes when Done is accepted', async () => {
    const { result, onCommit } = await mountEditor(ADD_OWNER, '50', true);
    await act(() => result.current.open());
    await act(() => result.current.setDraft('48.5'));

    await act(() => result.current.done());

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('48.5');
    expect(result.current.state.isOpen).toBe(false);
    expect(result.current.state.error).toBeUndefined();
  });

  it('closes on Cancel with no onCommit call, and the next open reads value again', async () => {
    const { result, onCommit } = await mountEditor(ADD_OWNER, '50', true);
    await act(() => result.current.open());
    await act(() => result.current.setDraft('48'));

    await act(() => result.current.cancel());

    expect(result.current.state.isOpen).toBe(false);
    expect(onCommit).not.toHaveBeenCalled();

    await act(() => result.current.open());
    expect(result.current.state).toEqual({ isOpen: true, draft: '50', error: undefined });
  });

  it("leaves the active owner's editor as it was through a second owner's setDraft, cancel and done", async () => {
    const first = await mountEditor(ADD_OWNER, '50', true);
    const second = await mountEditor(EDIT_OWNER, '49', true);
    second.onCommit.mockReturnValueOnce(false);
    await act(() => first.result.current.open());
    await act(() => first.result.current.setDraft('48'));
    const asItWas = { isOpen: true, draft: '48', error: undefined };
    expect(second.result.current.state.isOpen).toBe(false);

    await act(() => second.result.current.setDraft('1'));
    expect(first.result.current.state).toEqual(asItWas);

    await act(() => second.result.current.cancel());
    expect(first.result.current.state).toEqual(asItWas);

    await act(() => second.result.current.done());
    expect(first.result.current.state).toEqual(asItWas);

    await act(() => second.result.current.done());
    expect(first.result.current.state).toEqual(asItWas);
    expect(second.result.current.state.isOpen).toBe(false);
    expect(first.onCommit).not.toHaveBeenCalled();
  });

  it('resets the store when the active owner unmounts, and not when another owner does', async () => {
    const initial = storeFields();
    const first = await mountEditor(ADD_OWNER, '50', true);
    const second = await mountEditor(EDIT_OWNER, '49', true);
    await act(() => first.result.current.open());
    await act(() => first.result.current.setDraft('48'));

    await second.unmount();
    expect(storeFields()).toEqual({
      activeOwnerId: ADD_OWNER,
      isOpen: true,
      draft: '48',
      error: undefined,
    });

    await first.unmount();
    expect(storeFields()).toEqual(initial);
    expect(initial).toMatchObject({ activeOwnerId: undefined, isOpen: false });
  });
});

describe('useRateEditor inside a close', () => {
  it('commits nothing when Done follows Cancel before the close settles', async () => {
    const { result, onCommit } = await mountEditor(ADD_OWNER, '50', true);
    await act(() => result.current.open());
    await act(() => result.current.setDraft('48'));

    await act(() => result.current.cancel());
    await act(() => result.current.done());

    expect(onCommit).toHaveBeenCalledTimes(0);
    expect(result.current.state.isOpen).toBe(false);
  });

  it('refuses a reopen while a settled open closes after Cancel, and reopens once the close settles', async () => {
    const { result } = await mountEditor(ADD_OWNER, '50', true);
    await act(() => result.current.open());
    await act(() => result.current.settleOpen());
    await act(() => result.current.cancel());

    await act(() => result.current.open());
    expect(result.current.state.isOpen).toBe(false);

    await act(() => result.current.settleClose());
    await act(() => result.current.open());
    expect(result.current.state).toEqual({ isOpen: true, draft: '50', error: undefined });
  });

  it('refuses a reopen while a settled open closes after Done, and reopens once the close settles', async () => {
    const { result } = await mountEditor(ADD_OWNER, '50', true);
    await act(() => result.current.open());
    await act(() => result.current.settleOpen());
    await act(() => result.current.done());

    await act(() => result.current.open());
    expect(result.current.state.isOpen).toBe(false);

    await act(() => result.current.settleClose());
    await act(() => result.current.open());
    expect(result.current.state.isOpen).toBe(true);
  });

  it('reopens at once after a close of an open that never settled, whose close reports nothing', async () => {
    const { result } = await mountEditor(ADD_OWNER, '50', true);
    await act(() => result.current.open());
    await act(() => result.current.cancel());

    await act(() => result.current.open());
    expect(result.current.state.isOpen).toBe(true);
  });

  it('reopens after a release that came inside a close', async () => {
    const first = await mountEditor(ADD_OWNER, '50', true);
    await act(() => first.result.current.open());
    await act(() => first.result.current.settleOpen());
    await act(() => first.result.current.cancel());
    await first.unmount();

    const second = await mountEditor(ADD_OWNER, '49', true);
    await act(() => second.result.current.open());
    expect(second.result.current.state).toEqual({ isOpen: true, draft: '49', error: undefined });
  });
});

describe('useRateEditorFocus', () => {
  it('focuses the input the ref holds, once, and does nothing with no input mounted', async () => {
    const { result } = await renderHook(() => useRateEditorFocus());
    await act(() => result.current.focusInput());

    const focus = jest.fn();
    result.current.inputRef.current = { focus } as unknown as TextInput;
    await act(() => result.current.focusInput());

    expect(focus).toHaveBeenCalledTimes(1);
  });
});
