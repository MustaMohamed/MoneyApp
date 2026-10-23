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
import { useEditCommitment } from '@/modules/commitments/screens/commitments/commitment_form/edit_commitment.hook';
import { useEditCommitmentState } from '@/modules/commitments/screens/commitments/commitment_form/edit_commitment.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { makeTestCommitment } from '@/test_helpers/commitment';
import { deferred } from '@/test_helpers/deferred';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

const onSaved = jest.fn();
const onDeactivated = jest.fn();
const onMissing = jest.fn();

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

interface EditProps {
  commitmentId: string;
}

function mount(commitmentId = 'com-1') {
  return renderHook(
    (props: EditProps) =>
      useEditCommitment({
        commitmentId: props.commitmentId,
        onSaved,
        onDeactivated,
        onMissing,
      }),
    { initialProps: { commitmentId } },
  );
}

type Pending = ReturnType<typeof deferred<void>>;

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

function expectNoLanding() {
  expect(onSaved).not.toHaveBeenCalled();
  expect(onDeactivated).not.toHaveBeenCalled();
  expect(onMissing).not.toHaveBeenCalled();
}

const settles: [string, (pending: Pending) => void][] = [
  ['resolves', (pending) => pending.resolve()],
  ['rejects', (pending) => pending.reject(new Error('disk full'))],
];

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

  it('a save writes once and calls onSaved, not onDeactivated', async () => {
    const { result } = await mount();

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(updateCommitmentMock).toHaveBeenCalledTimes(1);
    expect(updateCommitmentMock).toHaveBeenCalledWith('com-1', expect.anything());
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onDeactivated).not.toHaveBeenCalled();
    expect(onMissing).not.toHaveBeenCalled();
    expect(result.current.state.saveError).toBeUndefined();
  });

  it('a confirmed deactivate calls onDeactivated and hides the confirm', async () => {
    const { result } = await mount();
    await act(async () => result.current.handleDeactivate());
    expect(result.current.state.deactivateDialogVisible).toBe(true);

    await act(async () => {
      await result.current.confirmDeactivate();
    });

    expect(deactivateCommitmentMock).toHaveBeenCalledTimes(1);
    expect(deactivateCommitmentMock).toHaveBeenCalledWith('com-1');
    expect(onDeactivated).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.state.deactivateDialogVisible).toBe(false);
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
    expect(onDeactivated).not.toHaveBeenCalled();
  });

  it('a failed deactivate sets the save error, hides the confirm and calls neither landing', async () => {
    deactivateCommitmentMock.mockRejectedValueOnce(new Error('deactivate failed'));
    const { result } = await mount();
    await act(async () => result.current.handleDeactivate());

    await act(async () => {
      await result.current.confirmDeactivate();
    });

    expect(result.current.state.saveError).toBe(Strings.commitmentsSaveError);
    expect(result.current.state.deactivateDialogVisible).toBe(false);
    expect(result.current.state.saving).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onDeactivated).not.toHaveBeenCalled();
  });

  it('a commitment missing at mount calls onMissing, and Save and Confirm write nothing', async () => {
    const { result } = await mount('com-missing');

    expect(onMissing).toHaveBeenCalled();

    await act(async () => {
      await result.current.onSubmit();
      await result.current.confirmDeactivate();
    });

    expect(updateCommitmentMock).not.toHaveBeenCalled();
    expect(deactivateCommitmentMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onDeactivated).not.toHaveBeenCalled();
  });

  it.each(settles)(
    'a commitment that goes while a save is in flight calls onMissing only once the save %s',
    async (_outcome, finish) => {
      const hook = await mount();
      const { pending, inFlight } = await startSave(hook);

      commitments = [];
      await hook.rerender({ commitmentId: 'com-1' });

      expect(onMissing).not.toHaveBeenCalled();

      await settle(inFlight, () => finish(pending));

      expect(onMissing).toHaveBeenCalled();
    },
  );

  describe('MA-115 a half-typed amount after a refused Save', () => {
    const amountError = (result: { current: ReturnType<typeof useEditCommitment> }) =>
      result.current.form.getFieldState('amount').error?.message;

    async function mountRefused() {
      const { result } = await mount();
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

  it('a deactivate that resolves after its copy unmounts writes nothing back', async () => {
    const pendingDeactivate = deferred<void>();
    deactivateCommitmentMock.mockReturnValue(pendingDeactivate.promise);
    const copy = await mount();
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

  it('a failed deactivate closes the confirm and shows the banner on the copy that confirmed only', async () => {
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
    expect(onDeactivated).not.toHaveBeenCalled();
  });

  describe('MA-188 the mounted form rerenders on a second commitment', () => {
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

    beforeEach(() => {
      commitments = [commitment, second];
    });

    async function openOn(hook: Hook, id: string) {
      await hook.rerender({ commitmentId: id });
    }

    async function typeName(hook: Hook, name: string) {
      await act(async () => {
        hook.result.current.form.setValue('name', name, { shouldDirty: true, shouldTouch: true });
      });
    }

    it('keeps what the user typed through a reload of the commitments on one commitment', async () => {
      const hook = await mount();
      await typeName(hook, 'Typed name');

      commitments = [{ ...commitment }, second];
      await hook.rerender({ commitmentId: 'com-1' });

      expect(hook.result.current.form.getValues('name')).toBe('Typed name');
    });

    it('every field shows the second commitment stored values', async () => {
      const hook = await mount();
      await typeName(hook, 'Typed name');

      await openOn(hook, 'com-2');

      expect(hook.result.current.form.getValues()).toEqual(buildEditDefaults(second));
    });

    it('drops a settled save failure of the first commitment', async () => {
      updateCommitmentMock.mockRejectedValueOnce(new Error('disk full'));
      const hook = await mount();
      await act(async () => {
        await hook.result.current.onSubmit();
      });
      expect(hook.result.current.state.saveError).toBe(Strings.commitmentsSaveError);

      await openOn(hook, 'com-2');

      expect(hook.result.current.state.saveError).toBeUndefined();
    });

    it('closes a deactivate confirmation opened on the first commitment', async () => {
      const hook = await mount();
      await act(async () => hook.result.current.handleDeactivate());
      expect(hook.result.current.state.deactivateDialogVisible).toBe(true);

      await openOn(hook, 'com-2');

      expect(hook.result.current.state.deactivateDialogVisible).toBe(false);
    });

    it('a commitment that loads after mount drafts its stored values', async () => {
      commitments = [];
      const hook = await mount();

      commitments = [commitment];
      await hook.rerender({ commitmentId: 'com-1' });

      expect(hook.result.current.form.getValues()).toEqual(buildEditDefaults(commitment));
    });

    it('calls onMissing when it rerenders on an id the commitments lack, and Save and Confirm write nothing', async () => {
      const hook = await mount();
      expect(onMissing).not.toHaveBeenCalled();

      await openOn(hook, 'com-missing');

      expect(onMissing).toHaveBeenCalled();
      await act(async () => {
        await hook.result.current.onSubmit();
        await hook.result.current.confirmDeactivate();
      });
      expect(updateCommitmentMock).not.toHaveBeenCalled();
      expect(deactivateCommitmentMock).not.toHaveBeenCalled();
    });

    it.each(settles)(
      'a first commitment save that %s after the switch shows no error and calls no landing',
      async (_outcome, finish) => {
        const hook = await mount();
        const { pending, inFlight } = await startSave(hook);

        await openOn(hook, 'com-2');
        await settle(inFlight, () => finish(pending));

        expect(updateCommitmentMock).toHaveBeenCalledTimes(1);
        expect(updateCommitmentMock).toHaveBeenCalledWith('com-1', expect.anything());
        expectNoLanding();
        expect(hook.result.current.state.saveError).toBeUndefined();
        expect(hook.result.current.state.saving).toBe(false);
        expect(hook.result.current.form.getValues()).toEqual(buildEditDefaults(second));
      },
    );

    it.each(settles)(
      'a first commitment deactivate that %s after the confirmation reopens on the second calls no landing and keeps it open',
      async (_outcome, finish) => {
        const hook = await mount();
        const { pending, inFlight } = await startDeactivate(hook);

        await openOn(hook, 'com-2');
        await act(async () => hook.result.current.handleDeactivate());
        expect(hook.result.current.state.deactivateDialogVisible).toBe(true);
        await settle(inFlight, () => finish(pending));

        expect(deactivateCommitmentMock).toHaveBeenCalledTimes(1);
        expect(deactivateCommitmentMock).toHaveBeenCalledWith('com-1');
        expectNoLanding();
        expect(hook.result.current.state.deactivateDialogVisible).toBe(true);
        expect(hook.result.current.state.saveError).toBeUndefined();
        expect(hook.result.current.state.saving).toBe(false);
      },
    );

    it('a Save on the second commitment while the first commitment save is in flight writes nothing and leaves the form unsubmitted', async () => {
      const hook = await mount();
      expect(hook.result.current.form.formState.isSubmitted).toBe(false);
      expect(hook.result.current.form.formState.submitCount).toBe(0);
      const { pending, inFlight } = await startSave(hook);

      await openOn(hook, 'com-2');
      await act(async () => {
        await hook.result.current.onSubmit();
      });

      expect(updateCommitmentMock).toHaveBeenCalledTimes(1);
      expect(updateCommitmentMock).toHaveBeenCalledWith('com-1', expect.anything());
      expect(hook.result.current.form.formState.isSubmitted).toBe(false);
      expect(hook.result.current.form.formState.submitCount).toBe(0);

      await settle(inFlight, () => pending.resolve());
    });

    it.each(settles)(
      'a first commitment save that %s after it rerenders on a missing id calls onMissing and no other landing',
      async (_outcome, finish) => {
        const hook = await mount();
        const { pending, inFlight } = await startSave(hook);

        await openOn(hook, 'com-missing');
        await settle(inFlight, () => finish(pending));

        expect(updateCommitmentMock).toHaveBeenCalledTimes(1);
        expect(updateCommitmentMock).toHaveBeenCalledWith('com-1', expect.anything());
        expect(onMissing).toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
        expect(onDeactivated).not.toHaveBeenCalled();
        expect(hook.result.current.state.saveError).toBeUndefined();
      },
    );

    it.each(settles)(
      'a first commitment deactivate that %s after it rerenders on a missing id calls onMissing and no other landing',
      async (_outcome, finish) => {
        const hook = await mount();
        const { pending, inFlight } = await startDeactivate(hook);

        await openOn(hook, 'com-missing');
        await settle(inFlight, () => finish(pending));

        expect(deactivateCommitmentMock).toHaveBeenCalledTimes(1);
        expect(deactivateCommitmentMock).toHaveBeenCalledWith('com-1');
        expect(onMissing).toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
        expect(onDeactivated).not.toHaveBeenCalled();
        expect(hook.result.current.state.saveError).toBeUndefined();
      },
    );

    it('a Save after it rerenders on the second commitment writes the second and calls onSaved', async () => {
      const hook = await mount();

      await openOn(hook, 'com-2');
      await act(async () => {
        await hook.result.current.onSubmit();
      });

      expect(updateCommitmentMock).toHaveBeenCalledTimes(1);
      expect(updateCommitmentMock).toHaveBeenCalledWith('com-2', expect.anything());
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(onDeactivated).not.toHaveBeenCalled();
    });

    it('a Confirm after it rerenders on the second commitment deactivates the second and calls onDeactivated', async () => {
      const hook = await mount();

      await openOn(hook, 'com-2');
      await act(async () => hook.result.current.handleDeactivate());
      await act(async () => {
        await hook.result.current.confirmDeactivate();
      });

      expect(deactivateCommitmentMock).toHaveBeenCalledTimes(1);
      expect(deactivateCommitmentMock).toHaveBeenCalledWith('com-2');
      expect(onDeactivated).toHaveBeenCalledTimes(1);
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('a Confirm while a save is in flight does not deactivate', async () => {
      const hook = await mount();
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
        const hook = await mount();
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
