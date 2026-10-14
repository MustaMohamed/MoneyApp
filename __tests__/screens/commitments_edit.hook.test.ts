import { act, renderHook } from '@testing-library/react-native';

import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import {
  COMMITMENT_AMOUNT_REFUSES_ZERO,
  buildEditDefaults,
} from '@/modules/commitments/screens/commitments/commitment_form.shared';
import { useEditCommitment } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { TABBED_ORIGIN } from '@/modules/navigation/domain/stacked_route';
import { deferred } from '@/test_helpers/deferred';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

const mockRouterBack = jest.fn();
const mockRouterDismissAll = jest.fn();
const mockRouterDismissTo = jest.fn();
const mockRouterReplace = jest.fn();
const mockPathname = { current: '/commitments/com-1/edit' };
let mockParams: { id: string; originTxId?: string; originTxCopy?: string } = { id: 'com-1' };

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  usePathname: () => mockPathname.current,
  useRouter: () => ({
    back: mockRouterBack,
    replace: mockRouterReplace,
    dismissAll: mockRouterDismissAll,
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

let commitments: Commitment[] = [commitment];

const updateCommitmentMock = jest.fn().mockResolvedValue(undefined);
const deactivateCommitmentMock = jest.fn().mockResolvedValue(undefined);

function setup() {
  updateCommitmentMock.mockResolvedValue(undefined);
  deactivateCommitmentMock.mockResolvedValue(undefined);
  commitments = [commitment];
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments,
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

type Pending = ReturnType<typeof deferred<void>>;

type Hook = Awaited<ReturnType<typeof renderHook<ReturnType<typeof useEditCommitment>, unknown>>>;

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

  it('saving from a mirror opened on a tabbed transaction pops every screen above the tabs', async () => {
    mockPathname.current = '/stacked/commitments/com-1/edit';
    mockParams = { id: 'com-1', originTxId: 'tx-1', originTxCopy: TABBED_ORIGIN };
    const { result } = await renderHook(() => useEditCommitment());

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(updateCommitmentMock).toHaveBeenCalled();
    expect(mockRouterDismissAll).toHaveBeenCalled();
    expect(mockRouterDismissTo).not.toHaveBeenCalled();
  });

  it('deactivating from a mirror opened on a tabbed transaction pops every screen above the tabs', async () => {
    mockPathname.current = '/stacked/commitments/com-1/edit';
    mockParams = { id: 'com-1', originTxId: 'tx-1', originTxCopy: TABBED_ORIGIN };
    const { result } = await renderHook(() => useEditCommitment());

    await act(async () => {
      await result.current.confirmDeactivate();
    });

    expect(deactivateCommitmentMock).toHaveBeenCalledWith('com-1');
    expect(mockRouterDismissAll).toHaveBeenCalled();
    expect(mockRouterDismissTo).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  describe('MA-115 a half-typed amount after a refused Save', () => {
    const amountError = (result: { current: ReturnType<typeof useEditCommitment> }) =>
      result.current.form.getFieldState('amount').error?.message;

    async function mountRefused() {
      const { result } = await renderHook(() => useEditCommitment());
      await act(() => {
        result.current.form.setValue('amount', undefined);
      });
      await act(async () => {
        await result.current.onSubmit();
      });
      expect(updateCommitmentMock).not.toHaveBeenCalled();
      expect(amountError(result)).toBe(Strings.commitmentsErrAmountRequired);
      return result;
    }

    // The pairs `DecimalAmountInput` sends: the number it stores and the text typed.
    it.each([
      ['0', 0],
      ['0.', 0],
      ['0.0', 0],
      ['48.', 48],
      ['.', undefined],
    ] as const)(
      'holds the typed text %p stored as %p and leaves no amount error',
      async (text, n) => {
        const result = await mountRefused();

        let held: boolean | undefined;
        await act(async () => {
          held = holdStillTypingDecimal(
            result.current.form,
            'amount',
            n,
            COMMITMENT_AMOUNT_REFUSES_ZERO,
            text,
          );
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(held).toBe(true);
        expect(result.current.form.getValues('amount')).toBe(n);
        expect(amountError(result)).toBeUndefined();
      },
    );

    it('does not hold 0.001, and the shipped call validates it to the floor message', async () => {
      const result = await mountRefused();

      let held: boolean | undefined;
      await act(async () => {
        held = holdStillTypingDecimal(
          result.current.form,
          'amount',
          0.001,
          COMMITMENT_AMOUNT_REFUSES_ZERO,
          '0.001',
        );
        if (!held) {
          result.current.form.setValue('amount', 0.001, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(held).toBe(false);
      expect(amountError(result)).toBe(Strings.commitmentsErrAmountPositive);
    });
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

    const pendingRetry = deferred<void>();
    updateCommitmentMock.mockReturnValue(pendingRetry.promise);
    let retrying: Promise<void> | undefined;

    await act(async () => {
      retrying = result.current.onSubmit();
    });

    expect(result.current.state.saveError).toBeUndefined();
    expect(result.current.state.saving).toBe(true);

    await act(async () => {
      pendingRetry.resolve();
      await retrying;
    });
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

  describe('MA-188 the route opens on a second commitment on the mounted screen', () => {
    const second: Commitment = {
      id: 'com-2',
      name: 'Cloud storage',
      amount_type: AmountType.Variable,
      amount: 15,
      currency: Currency.USD,
      category_id: 'category-software',
      recurrence_every: 2,
      recurrence_period: RecurrencePeriod.Weeks,
      start_date: '2026-03-31',
      account_id: 'acc-usd',
      notes: 'Family plan',
      duration_type: DurationType.AfterCount,
      end_date: '2026-12-31',
      end_after_count: 12,
      is_active: 1,
      created_at: '2026-03-31T00:00:00.000Z',
      updated_at: '2026-03-31T00:00:00.000Z',
    };

    const settles: [string, (pending: Pending) => void][] = [
      ['resolves', (pending) => pending.resolve()],
      ['rejects', (pending) => pending.reject(new Error('disk full'))],
    ];

    beforeEach(() => {
      commitments = [commitment, second];
    });

    async function openOn(hook: Hook, id: string) {
      mockParams = { id };
      mockPathname.current = `/commitments/${id}/edit`;
      await hook.rerender({});
    }

    async function typeName(hook: Hook, name: string) {
      await act(async () => {
        hook.result.current.form.setValue('name', name, { shouldDirty: true, shouldTouch: true });
      });
    }

    async function startSave(hook: Hook) {
      const pending = deferred<void>();
      updateCommitmentMock.mockReturnValueOnce(pending.promise);
      let inFlight = Promise.resolve();
      await act(async () => {
        inFlight = hook.result.current.onSubmit();
      });
      expect(hook.result.current.state.saving).toBe(true);
      return { pending, inFlight };
    }

    async function startDeactivate(hook: Hook) {
      const pending = deferred<void>();
      deactivateCommitmentMock.mockReturnValueOnce(pending.promise);
      await act(async () => hook.result.current.handleDeactivate());
      let inFlight = Promise.resolve();
      await act(async () => {
        inFlight = hook.result.current.confirmDeactivate();
      });
      expect(hook.result.current.state.saving).toBe(true);
      return { pending, inFlight };
    }

    async function settle(inFlight: Promise<void>, finish: () => void) {
      await act(async () => {
        finish();
        await inFlight;
      });
    }

    function expectNoNavigation() {
      expect(mockRouterDismissTo).not.toHaveBeenCalled();
      expect(mockRouterBack).not.toHaveBeenCalled();
      expect(mockRouterDismissAll).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    }

    it('keeps what the user typed through a reload of the commitments on one commitment', async () => {
      const hook = await renderHook(() => useEditCommitment());
      await typeName(hook, 'Typed name');

      commitments = [{ ...commitment }, second];
      await hook.rerender({});

      expect(hook.result.current.form.getValues('name')).toBe('Typed name');
    });

    it('every field shows the second commitment stored values', async () => {
      const hook = await renderHook(() => useEditCommitment());
      await typeName(hook, 'Typed name');

      await openOn(hook, 'com-2');

      expect(hook.result.current.form.getValues()).toEqual(buildEditDefaults(second));
    });

    it('drops a settled save failure of the first commitment', async () => {
      updateCommitmentMock.mockRejectedValueOnce(new Error('disk full'));
      const hook = await renderHook(() => useEditCommitment());
      await act(async () => {
        await hook.result.current.onSubmit();
      });
      expect(hook.result.current.state.saveError).toBe(Strings.commitmentsSaveError);

      await openOn(hook, 'com-2');

      expect(hook.result.current.state.saveError).toBeUndefined();
    });

    it('closes a deactivate confirmation opened on the first commitment', async () => {
      const hook = await renderHook(() => useEditCommitment());
      await act(async () => hook.result.current.handleDeactivate());
      expect(hook.result.current.state.deactivateDialogVisible).toBe(true);

      await openOn(hook, 'com-2');

      expect(hook.result.current.state.deactivateDialogVisible).toBe(false);
    });

    it('a commitment that loads after mount drafts its stored values', async () => {
      commitments = [];
      const hook = await renderHook(() => useEditCommitment());

      commitments = [commitment];
      await hook.rerender({});

      expect(hook.result.current.form.getValues()).toEqual(buildEditDefaults(commitment));
    });

    it('leaves the screen when the route opens on an id the commitments lack, and Save and Confirm write nothing', async () => {
      const hook = await renderHook(() => useEditCommitment());
      expect(mockRouterBack).not.toHaveBeenCalled();

      await openOn(hook, 'com-missing');

      expect(mockRouterBack).toHaveBeenCalled();
      await act(async () => {
        await hook.result.current.onSubmit();
        await hook.result.current.confirmDeactivate();
      });
      expect(updateCommitmentMock).not.toHaveBeenCalled();
      expect(deactivateCommitmentMock).not.toHaveBeenCalled();
    });

    it.each(settles)(
      'a first commitment save that %s after the switch shows no error and navigates nowhere',
      async (_outcome, finish) => {
        const hook = await renderHook(() => useEditCommitment());
        const { pending, inFlight } = await startSave(hook);

        await openOn(hook, 'com-2');
        await settle(inFlight, () => finish(pending));

        expect(updateCommitmentMock).toHaveBeenCalledTimes(1);
        expect(updateCommitmentMock).toHaveBeenCalledWith('com-1', expect.anything());
        expectNoNavigation();
        expect(hook.result.current.state.saveError).toBeUndefined();
        expect(hook.result.current.state.saving).toBe(false);
        expect(hook.result.current.form.getValues()).toEqual(buildEditDefaults(second));
      },
    );

    it.each(settles)(
      'a first commitment deactivate that %s after the confirmation reopens on the second navigates nowhere and keeps it open',
      async (_outcome, finish) => {
        const hook = await renderHook(() => useEditCommitment());
        const { pending, inFlight } = await startDeactivate(hook);

        await openOn(hook, 'com-2');
        await act(async () => hook.result.current.handleDeactivate());
        expect(hook.result.current.state.deactivateDialogVisible).toBe(true);
        await settle(inFlight, () => finish(pending));

        expect(deactivateCommitmentMock).toHaveBeenCalledTimes(1);
        expect(deactivateCommitmentMock).toHaveBeenCalledWith('com-1');
        expectNoNavigation();
        expect(hook.result.current.state.deactivateDialogVisible).toBe(true);
        expect(hook.result.current.state.saveError).toBeUndefined();
        expect(hook.result.current.state.saving).toBe(false);
      },
    );

    it('a Save on the second commitment while the first commitment save is in flight writes nothing', async () => {
      const hook = await renderHook(() => useEditCommitment());
      const { pending, inFlight } = await startSave(hook);

      await openOn(hook, 'com-2');
      await act(async () => {
        await hook.result.current.onSubmit();
      });

      expect(updateCommitmentMock).toHaveBeenCalledTimes(1);
      expect(updateCommitmentMock).toHaveBeenCalledWith('com-1', expect.anything());

      await settle(inFlight, () => pending.resolve());
    });

    it('a Confirm while a save is in flight does not deactivate', async () => {
      const hook = await renderHook(() => useEditCommitment());
      const { pending, inFlight } = await startSave(hook);

      await act(async () => hook.result.current.handleDeactivate());
      await act(async () => {
        await hook.result.current.confirmDeactivate();
      });

      expect(deactivateCommitmentMock).not.toHaveBeenCalled();

      await settle(inFlight, () => pending.resolve());
    });

    it.each(settles)(
      'a first commitment save that %s after the switch leaves the second commitment unsubmitted, with its edits kept',
      async (_outcome, finish) => {
        const hook = await renderHook(() => useEditCommitment());
        expect(hook.result.current.form.formState.isSubmitted).toBe(false);
        expect(hook.result.current.form.formState.submitCount).toBe(0);
        const { pending, inFlight } = await startSave(hook);

        await openOn(hook, 'com-2');
        await typeName(hook, 'Typed on second');
        await settle(inFlight, () => finish(pending));

        const { form } = hook.result.current;
        expect(form.formState.isSubmitted).toBe(false);
        expect(form.formState.submitCount).toBe(0);
        expect(form.getValues('name')).toBe('Typed on second');
        expect(form.getFieldState('name')).toEqual(
          expect.objectContaining({ isDirty: true, isTouched: true }),
        );
      },
    );
  });
});
