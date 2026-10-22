import { act, renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.state';
import { useCommitmentFormHost } from '@/modules/commitments/screens/commitments/commitment_form/commitment_form_host.hook';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { deferred } from '@/test_helpers/deferred';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));

type HostResult = { current: ReturnType<typeof useCommitmentFormHost> };

const addCommitmentMock = jest.fn().mockResolvedValue(undefined);
const host = () => useCommitmentFormHostState.getState();

let addListenerSpy: jest.SpiedFunction<typeof BackHandler.addEventListener>;
let removeMocks: jest.Mock[];

function pressBack(): boolean | null | undefined {
  const call = addListenerSpy.mock.calls.at(-1);
  if (call === undefined) throw new Error('no hardware back listener was added');
  expect(call[0]).toBe('hardwareBackPress');
  return call[1]({ type: 'hardwareBackPress', timeStamp: 0 });
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function openAndFill(result: HostResult): Promise<void> {
  await act(() => host().openAdd());
  await act(() => {
    result.current.form.setValue('name', 'Rent');
    result.current.form.setValue('amount', 5000);
    result.current.form.setValue('categoryId', 'category-rent');
  });
}

async function failSave(result: HostResult): Promise<void> {
  addCommitmentMock.mockRejectedValueOnce(new Error('insert failed'));
  await act(() => result.current.handleSave());
  await settle();
  expect(result.current.state.saveError).toBe(Strings.commitmentsSaveError);
}

async function closeUnsaved(result: HostResult): Promise<void> {
  await act(() => result.current.handleOpenChange(false));
  await act(() => result.current.handleCloseComplete());
}

describe('useCommitmentFormHost', () => {
  beforeEach(() => {
    addCommitmentMock.mockReset().mockResolvedValue(undefined);
    attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
      addCommitment: addCommitmentMock,
    }));
    useAccountStore.setState({ accounts: [], accountLookupById: {}, hasLoaded: false });
    useCategoryStore.setState({ categories: [], hasLoaded: false });
    host().reset();
    useAddCommitmentState.getState().reset();
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

  it('adds no back listener and holds no session while closed', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());

    expect(host().phase).toBe('closed');
    expect(addListenerSpy).not.toHaveBeenCalled();
    expect(result.current.state.hasSession).toBe(false);
  });

  it('clears a failed draft as soon as the sheet has closed', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await openAndFill(result);
    await failSave(result);

    await closeUnsaved(result);

    expect(host().phase).toBe('closed');
    expect(result.current.state.hasSession).toBe(false);
    expect(result.current.form.getValues('name')).toBe('');
    expect(result.current.state.saveError).toBeUndefined();
  });

  it('writes nothing on a Save while the sheet is closing', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await openAndFill(result);
    await act(() => result.current.handleOpenChange(false));
    expect(host().phase).toBe('closing');

    await act(() => result.current.handleSave());
    await settle();

    expect(addCommitmentMock).not.toHaveBeenCalled();
  });

  it('closes on hardware back, then removes its listener once closed', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());

    let handled: boolean | null | undefined;
    await act(() => {
      handled = pressBack();
    });
    expect(handled).toBe(true);
    expect(host().phase).toBe('closing');

    await act(() => result.current.handleCloseComplete());

    expect(host().phase).toBe('closed');
    expect(removeMocks.length).toBeGreaterThan(0);
    for (const remove of removeMocks) expect(remove).toHaveBeenCalledTimes(1);
  });

  it('is dismissable at rest under the add title, and a close request starts closing', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());

    expect(result.current.state.isOpen).toBe(true);
    expect(result.current.state.hasSession).toBe(true);
    expect(result.current.state.isDismissable).toBe(true);
    expect(result.current.state.title).toBe(Strings.commitmentsAddTitle);

    await act(() => result.current.handleOpenChange(false));

    expect(host().phase).toBe('closing');
    expect(result.current.state.isOpen).toBe(false);
  });

  it('refuses back and a close request while a save is in flight, and closes once it lands', async () => {
    const save = deferred<void>();
    const { result } = await renderHook(() => useCommitmentFormHost());
    await openAndFill(result);
    addCommitmentMock.mockReturnValueOnce(save.promise);

    await act(() => result.current.handleSave());
    await settle();
    expect(addCommitmentMock).toHaveBeenCalledTimes(1);
    expect(result.current.state.saving).toBe(true);
    expect(result.current.state.isDismissable).toBe(false);

    await act(() => {
      pressBack();
    });
    expect(host().phase).toBe('open');
    await act(() => result.current.handleOpenChange(false));
    expect(host().phase).toBe('open');

    await act(async () => {
      save.resolve();
      await save.promise;
    });
    await settle();

    expect(host().phase).toBe('closing');
  });

  it('stays open with the save error after a rejected add', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await openAndFill(result);

    await failSave(result);

    expect(addCommitmentMock).toHaveBeenCalledTimes(1);
    expect(host().phase).toBe('open');
    expect(result.current.state.isOpen).toBe(true);
  });

  it('keeps a name typed while open through a rerender', async () => {
    const { result, rerender } = await renderHook(() => useCommitmentFormHost());
    await act(() => host().openAdd());
    await act(() => {
      result.current.form.setValue('name', 'Rent');
    });

    await rerender({});

    expect(result.current.form.getValues('name')).toBe('Rent');
  });

  it('reopens on an empty draft with no save error after an unsaved close', async () => {
    const { result } = await renderHook(() => useCommitmentFormHost());
    await openAndFill(result);
    await failSave(result);
    await closeUnsaved(result);

    await act(() => host().openAdd());

    expect(host().phase).toBe('open');
    expect(host().sessionId).toBe(2);
    expect(result.current.form.getValues('name')).toBe('');
    expect(result.current.state.saveError).toBeUndefined();
  });
});
