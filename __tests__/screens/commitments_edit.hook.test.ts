import { act, renderHook } from '@testing-library/react-native';

import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import { useEditCommitment } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockRouterBack = jest.fn();
const mockRouterDismissTo = jest.fn();
const mockRouterReplace = jest.fn();
const mockPathname = { current: '/commitments/com-1/edit' };
let mockParams: { id: string; originTxId?: string } = { id: 'com-1' };

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  usePathname: () => mockPathname.current,
  useRouter: () => ({
    back: mockRouterBack,
    replace: mockRouterReplace,
    dismissTo: mockRouterDismissTo,
  }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));

const commitment: Commitment = {
  id: 'com-1',
  name: 'Rent',
  amount_type: AmountType.Fixed,
  amount: 5000,
  currency: Currency.EGP,
  category_id: 'category-rent',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2026-01-01',
  account_id: null,
  notes: null,
  duration_type: DurationType.Forever,
  end_date: null,
  end_after_count: null,
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const updateCommitmentMock = jest.fn().mockResolvedValue(undefined);
const deactivateCommitmentMock = jest.fn().mockResolvedValue(undefined);

function setup() {
  updateCommitmentMock.mockResolvedValue(undefined);
  deactivateCommitmentMock.mockResolvedValue(undefined);
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [commitment],
    payments: [],
    selectedMonth: '2026-05',
    updateCommitment: updateCommitmentMock,
    deactivateCommitment: deactivateCommitmentMock,
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories: [],
  }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const entries = () => useEditCommitmentState.getState().entries;

// Mounts the lower copy first, so each copy's owner is read off the key its mount added.
async function mountTwoCopies() {
  const lower = await renderHook(() => useEditCommitment());
  const [lowerOwner] = Object.keys(entries());
  const upper = await renderHook(() => useEditCommitment());
  const upperOwner = Object.keys(entries()).find((key) => key !== lowerOwner)!;
  return { lower, lowerOwner, upper, upperOwner };
}

describe('useEditCommitment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.current = '/commitments/com-1/edit';
    mockParams = { id: 'com-1' };
    useEditCommitmentState.getState().reset();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useEditCommitment())).resolves.toBeDefined();
  });

  it('saving defaults to false', async () => {
    const { result } = await renderHook(() => useEditCommitment());
    expect(result.current.state.saving).toBe(false);
  });

  it('saving from the tabbed copy dismisses to the commitments list', async () => {
    const { result } = await renderHook(() => useEditCommitment());

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(updateCommitmentMock).toHaveBeenCalled();
    expect(mockRouterDismissTo).toHaveBeenCalledWith('/commitments');
  });

  it('saving from the stacked copy pops back to the stacked transaction it came from', async () => {
    mockPathname.current = '/stacked/commitments/com-1/edit';
    mockParams.originTxId = 'tx-1';
    const { result } = await renderHook(() => useEditCommitment());

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(updateCommitmentMock).toHaveBeenCalled();
    expect(mockRouterDismissTo).toHaveBeenCalledWith('/stacked/transactions/detail/tx-1');
    expect(mockRouterDismissTo).not.toHaveBeenCalledWith('/commitments');
  });

  it('saving from a stacked copy with no origin falls back to one step inside the mirror', async () => {
    mockPathname.current = '/stacked/commitments/com-1/edit';
    const { result } = await renderHook(() => useEditCommitment());

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(updateCommitmentMock).toHaveBeenCalled();
    expect(mockRouterBack).toHaveBeenCalled();
    expect(mockRouterDismissTo).not.toHaveBeenCalled();
  });

  it('deactivating from the tabbed copy replaces with the commitments list', async () => {
    const { result } = await renderHook(() => useEditCommitment());

    await act(async () => {
      await result.current.confirmDeactivate();
    });

    expect(deactivateCommitmentMock).toHaveBeenCalledWith('com-1');
    expect(mockRouterReplace).toHaveBeenCalledWith('/commitments');
  });

  it('deactivating from the stacked copy pops back to the stacked transaction it came from', async () => {
    mockPathname.current = '/stacked/commitments/com-1/edit';
    mockParams.originTxId = 'tx-1';
    const { result } = await renderHook(() => useEditCommitment());

    await act(async () => {
      await result.current.confirmDeactivate();
    });

    expect(deactivateCommitmentMock).toHaveBeenCalledWith('com-1');
    expect(mockRouterDismissTo).toHaveBeenCalledWith('/stacked/transactions/detail/tx-1');
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('keeps the form open and publishes a retryable error when update fails', async () => {
    updateCommitmentMock.mockRejectedValueOnce(new Error('regeneration failed'));
    const { result } = await renderHook(() => useEditCommitment());

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(result.current.state.saveError).toBe(Strings.commitmentsSaveError);
    expect(result.current.state.saving).toBe(false);
    expect(mockRouterDismissTo).not.toHaveBeenCalled();
  });

  it('a write on one mounted copy changes nothing on the other', async () => {
    updateCommitmentMock.mockRejectedValueOnce(new Error('regeneration failed'));
    const { lower, upper } = await mountTwoCopies();

    await act(async () => {
      await lower.result.current.onSubmit();
    });

    expect(lower.result.current.state.saveError).toBe(Strings.commitmentsSaveError);
    expect(upper.result.current.state.saveError).toBeUndefined();

    await act(async () => upper.result.current.handleDeactivate());

    expect(upper.result.current.state.deactivateDialogVisible).toBe(true);
    expect(lower.result.current.state.deactivateDialogVisible).toBe(false);
  });

  it('an unmounted copy releases only its own entry', async () => {
    updateCommitmentMock.mockRejectedValueOnce(new Error('regeneration failed'));
    const { lower, lowerOwner, upper } = await mountTwoCopies();
    await act(async () => {
      await lower.result.current.onSubmit();
    });
    const shown = entries()[lowerOwner];

    expect(Object.keys(entries())).toHaveLength(2);

    await upper.unmount();

    expect(Object.keys(entries())).toEqual([lowerOwner]);
    expect(entries()[lowerOwner]).toBe(shown);
    expect(lower.result.current.state.saveError).toBe(Strings.commitmentsSaveError);

    await lower.unmount();

    expect(entries()).toEqual({});
  });

  it('a save that resolves after its copy unmounts writes nothing back', async () => {
    const pendingUpdate = deferred<void>();
    updateCommitmentMock.mockReturnValue(pendingUpdate.promise);
    const copy = await renderHook(() => useEditCommitment());
    let saving: Promise<void> | undefined;

    await act(async () => {
      saving = copy.result.current.onSubmit();
    });
    expect(updateCommitmentMock).toHaveBeenCalled();

    await copy.unmount();
    await act(async () => {
      pendingUpdate.resolve();
      await saving;
    });

    expect(entries()).toEqual({});
  });

  it('a deactivate that resolves after its copy unmounts writes nothing back', async () => {
    const pendingDeactivate = deferred<void>();
    deactivateCommitmentMock.mockReturnValue(pendingDeactivate.promise);
    const copy = await renderHook(() => useEditCommitment());
    let deactivating: Promise<void> | undefined;

    await act(async () => {
      deactivating = copy.result.current.confirmDeactivate();
    });
    expect(deactivateCommitmentMock).toHaveBeenCalled();

    await copy.unmount();
    await act(async () => {
      pendingDeactivate.resolve();
      await deactivating;
    });

    expect(entries()).toEqual({});
  });

  it('a failed deactivate closes the sheet and shows the banner on the copy that confirmed only', async () => {
    deactivateCommitmentMock.mockRejectedValueOnce(new Error('deactivate failed'));
    const { lower, upper, upperOwner } = await mountTwoCopies();
    await act(async () => lower.result.current.handleDeactivate());
    const before = entries()[upperOwner];

    await act(async () => {
      await lower.result.current.confirmDeactivate();
    });

    expect(lower.result.current.state.deactivateDialogVisible).toBe(false);
    expect(lower.result.current.state.saveError).toBe(Strings.commitmentsSaveError);
    expect(lower.result.current.state.saving).toBe(false);
    expect(entries()[upperOwner]).toBe(before);
    expect(upper.result.current.state.saveError).toBeUndefined();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
