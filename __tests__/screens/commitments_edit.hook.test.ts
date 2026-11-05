import { act, renderHook } from '@testing-library/react-native';
import { useController } from 'react-hook-form';

import { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import { applyCommitmentAmountText } from '@/modules/commitments/screens/commitments/commitment_form.helpers';
import {
  COMMITMENT_AMOUNT_REFUSES_ZERO,
  buildEditDefaults,
} from '@/modules/commitments/screens/commitments/commitment_form.shared';
import { useEditCommitment } from '@/modules/commitments/screens/commitments/commitment_form/edit_commitment.hook';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/edit_commitment.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { makeTestCommitment } from '@/test_helpers/commitment';
import { deferred } from '@/test_helpers/deferred';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

const onSaved = jest.fn();
const onStopped = jest.fn();

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));

const commitment = makeTestCommitment({
  id: 'com-1',
  amount: 5000,
  category_id: 'category-rent',
  account_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const second = makeTestCommitment({
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
  created_at: '2026-03-31T00:00:00.000Z',
  updated_at: '2026-03-31T00:00:00.000Z',
});

const updateCommitmentMock = jest.fn().mockResolvedValue(undefined);
const deactivateCommitmentMock = jest.fn().mockResolvedValue(undefined);

function setup() {
  updateCommitmentMock.mockResolvedValue(undefined);
  deactivateCommitmentMock.mockResolvedValue(undefined);
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [],
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

function mount(opened: Commitment = commitment) {
  return renderHook(() => useEditCommitment({ commitment: opened, onSaved, onStopped }));
}

type Hook = Awaited<ReturnType<typeof mount>>;

const entries = () => useEditCommitmentState.getState().entries;

// Mounts the lower copy first, so each copy's owner is read off the key its mount added.
async function mountTwoCopies() {
  const lower = await mount();
  const [lowerOwner] = Object.keys(entries());
  const upper = await mount();
  const upperOwner = Object.keys(entries()).find((key) => key !== lowerOwner)!;
  return { lower, lowerOwner, upper, upperOwner };
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

async function settle(inFlight: Promise<void>, finish: () => void) {
  await act(async () => {
    finish();
    await inFlight;
  });
}

describe('useEditCommitment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEditCommitmentState.getState().reset();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(mount()).resolves.toBeDefined();
  });

  it('saving defaults to false', async () => {
    const { result } = await mount();
    expect(result.current.state.saving).toBe(false);
  });

  it('a save writes once and calls onSaved, not onStopped', async () => {
    const { result } = await mount();

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(updateCommitmentMock).toHaveBeenCalledTimes(1);
    expect(updateCommitmentMock).toHaveBeenCalledWith('com-1', expect.anything());
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onStopped).not.toHaveBeenCalled();
    expect(result.current.state.saveError).toBeUndefined();
  });

  it('a confirmed Stop calls onStopped and hides the dialog', async () => {
    const { result } = await mount();
    await act(async () => result.current.openStopDialog());
    expect(result.current.state.stopDialogVisible).toBe(true);

    await act(async () => {
      await result.current.stopCommitment();
    });

    expect(deactivateCommitmentMock).toHaveBeenCalledTimes(1);
    expect(deactivateCommitmentMock).toHaveBeenCalledWith('com-1');
    expect(onStopped).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.state.stopDialogVisible).toBe(false);
  });

  it('a failed save sets the save error and calls neither landing', async () => {
    updateCommitmentMock.mockRejectedValueOnce(new Error('regeneration failed'));
    const { result } = await mount();

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(result.current.state.saveError).toBe(Strings.commitmentsSaveError);
    expect(result.current.state.saving).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onStopped).not.toHaveBeenCalled();
  });

  it('a failed Stop keeps the dialog open with its error, sets no save error and calls neither landing', async () => {
    deactivateCommitmentMock.mockRejectedValueOnce(new Error('deactivate failed'));
    const { result } = await mount();
    await act(async () => result.current.openStopDialog());

    await act(async () => {
      await result.current.stopCommitment();
    });

    expect(result.current.state.saveError).toBeUndefined();
    expect(result.current.state.stopDialogVisible).toBe(true);
    expect(result.current.state.stopError).toBe(true);
    expect(result.current.state.saving).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onStopped).not.toHaveBeenCalled();
  });

  describe('MA-115 a half-typed amount after a refused Save', () => {
    const amountError = (result: { current: ReturnType<typeof useEditCommitment> }) =>
      result.current.form.getFieldState('amount').error?.message;

    async function refuseSave(result: { current: ReturnType<typeof useEditCommitment> }) {
      await act(() => {
        result.current.form.setValue('amount', undefined);
      });
      await act(async () => {
        await result.current.onSubmit();
      });
      expect(updateCommitmentMock).not.toHaveBeenCalled();
      expect(amountError(result)).toBe(Strings.commitmentsErrAmountRequired);
    }

    async function mountRefused() {
      const { result } = await mount();
      await refuseSave(result);
      return result;
    }

    function useEditWithAmountField() {
      const hook = useEditCommitment({ commitment, onSaved, onStopped });
      const { field } = useController({ control: hook.form.control, name: 'amount' });
      return { ...hook, field };
    }

    // The pairs `applyCommitmentAmountText` passes on: the number it parses and the text typed.
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

    it('stores 0.001 through the amount field and validates it to the floor message', async () => {
      const { result } = await renderHook(() => useEditWithAmountField());
      await refuseSave(result);

      await act(async () => {
        applyCommitmentAmountText(result.current.form, '0.001', result.current.field.onChange);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.form.getValues('amount')).toBe(0.001);
      expect(amountError(result)).toBe(Strings.commitmentsErrAmountPositive);
    });
  });

  it('keeps the form open and publishes a retryable error when update fails', async () => {
    updateCommitmentMock.mockRejectedValueOnce(new Error('regeneration failed'));
    const { result } = await mount();

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(result.current.state.saveError).toBe(Strings.commitmentsSaveError);
    expect(result.current.state.saving).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();

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

    await act(async () => upper.result.current.openStopDialog());

    expect(upper.result.current.state.stopDialogVisible).toBe(true);
    expect(lower.result.current.state.stopDialogVisible).toBe(false);
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
    const copy = await mount();
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

  it('a Stop that resolves after its copy unmounts writes nothing back', async () => {
    const pendingDeactivate = deferred<void>();
    deactivateCommitmentMock.mockReturnValue(pendingDeactivate.promise);
    const copy = await mount();
    let deactivating: Promise<void> | undefined;

    await act(async () => {
      deactivating = copy.result.current.stopCommitment();
    });
    expect(deactivateCommitmentMock).toHaveBeenCalled();

    await copy.unmount();
    await act(async () => {
      pendingDeactivate.resolve();
      await deactivating;
    });

    expect(entries()).toEqual({});
  });

  it('a failed Stop keeps the dialog open with its error on the copy that confirmed only', async () => {
    deactivateCommitmentMock.mockRejectedValueOnce(new Error('deactivate failed'));
    const { lower, upper, upperOwner } = await mountTwoCopies();
    await act(async () => lower.result.current.openStopDialog());
    const before = entries()[upperOwner];

    await act(async () => {
      await lower.result.current.stopCommitment();
    });

    expect(lower.result.current.state.stopDialogVisible).toBe(true);
    expect(lower.result.current.state.stopError).toBe(true);
    expect(lower.result.current.state.saveError).toBeUndefined();
    expect(lower.result.current.state.saving).toBe(false);
    expect(entries()[upperOwner]).toBe(before);
    expect(upper.result.current.state.saveError).toBeUndefined();
    expect(upper.result.current.state.stopError).toBe(false);
    expect(onStopped).not.toHaveBeenCalled();
  });

  describe('MA-188 a save in flight', () => {
    it('a second Save while a save is in flight writes nothing and leaves the form unsubmitted', async () => {
      const hook = await mount();
      expect(hook.result.current.form.formState.isSubmitted).toBe(false);
      expect(hook.result.current.form.formState.submitCount).toBe(0);
      const { pending, inFlight } = await startSave(hook);

      await act(async () => {
        await hook.result.current.onSubmit();
      });

      expect(updateCommitmentMock).toHaveBeenCalledTimes(1);
      expect(updateCommitmentMock).toHaveBeenCalledWith('com-1', expect.anything());
      expect(hook.result.current.form.formState.isSubmitted).toBe(false);
      expect(hook.result.current.form.formState.submitCount).toBe(0);

      await settle(inFlight, () => pending.resolve());
    });

    it('a Stop confirmed while a save is in flight does not deactivate', async () => {
      const hook = await mount();
      const { pending, inFlight } = await startSave(hook);

      await act(async () => hook.result.current.openStopDialog());
      await act(async () => {
        await hook.result.current.stopCommitment();
      });

      expect(deactivateCommitmentMock).not.toHaveBeenCalled();

      await settle(inFlight, () => pending.resolve());
    });
  });

  describe('MA-256 a session on the commitment the detail holds, the month store empty', () => {
    it('reads every field of buildEditDefaults', async () => {
      const { result } = await mount(second);

      expect(result.current.form.getValues()).toEqual(buildEditDefaults(second));
    });

    it('a Save updates that id', async () => {
      const { result } = await mount(second);

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(updateCommitmentMock).toHaveBeenCalledTimes(1);
      expect(updateCommitmentMock).toHaveBeenCalledWith('com-2', expect.anything());
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    it('a Stop deactivates that id', async () => {
      const { result } = await mount(second);
      await act(async () => result.current.openStopDialog());

      await act(async () => {
        await result.current.stopCommitment();
      });

      expect(deactivateCommitmentMock).toHaveBeenCalledTimes(1);
      expect(deactivateCommitmentMock).toHaveBeenCalledWith('com-2');
      expect(onStopped).toHaveBeenCalledTimes(1);
    });
  });
});
