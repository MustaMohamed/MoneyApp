import { act, renderHook } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useAddCommitment } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.hook';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.state';
import { COMMITMENT_AMOUNT_REFUSES_ZERO } from '@/modules/commitments/screens/commitments/commitment_form.shared';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { deferred } from '@/test_helpers/deferred';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

const mockRouterBack = jest.fn();

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockRouterBack }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/screens/commitments/add_commitment/add_commitment.state', () => ({
  useAddCommitmentState: jest.fn(),
}));

const addCommitmentMock = jest.fn().mockResolvedValue(undefined);
const generatePaymentsMock = jest.fn().mockResolvedValue(undefined);
const setSaveErrorMock = jest.fn();
const resetStateMock = jest.fn();
const onSaved = jest.fn();
let saveErrorValue: string | undefined;

function setup() {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [],
    payments: [],
    addCommitment: addCommitmentMock,
    generatePayments: generatePaymentsMock,
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({
    categories: [],
  }));
  attachMockSelectorStore(useAddCommitmentState as unknown as jest.Mock, () => ({
    saving: false,
    saveError: saveErrorValue,
    setSaving: jest.fn(),
    setSaveError: setSaveErrorMock,
    reset: resetStateMock,
  }));
}

describe('useAddCommitment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    saveErrorValue = undefined;
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useAddCommitment({ onSaved }))).resolves.toBeDefined();
  });

  it('saving defaults to false', async () => {
    const { result } = await renderHook(() => useAddCommitment({ onSaved }));
    expect(result.current.state.saving).toBe(false);
  });

  it('leaves payment generation to the commitment mutation owner', async () => {
    const { result } = await renderHook(() => useAddCommitment({ onSaved }));
    await act(() => {
      result.current.form.setValue('name', 'Rent');
      result.current.form.setValue('amount', 5000);
      result.current.form.setValue('categoryId', 'category-rent');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(addCommitmentMock).toHaveBeenCalledTimes(1);
    expect(generatePaymentsMock).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  describe('MA-115 a half-typed amount after a refused Save', () => {
    const amountError = (result: { current: ReturnType<typeof useAddCommitment> }) =>
      result.current.form.getFieldState('amount').error?.message;

    async function mountRefused() {
      const { result } = await renderHook(() => useAddCommitment({ onSaved }));
      await act(async () => {
        await result.current.onSubmit();
      });
      expect(addCommitmentMock).not.toHaveBeenCalled();
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

  it('allows only one committed add while the first submit is in flight', async () => {
    const save = deferred<void>();
    addCommitmentMock.mockReturnValueOnce(save.promise);
    const { result } = await renderHook(() => useAddCommitment({ onSaved }));
    await act(() => {
      result.current.form.setValue('name', 'Rent');
      result.current.form.setValue('amount', 5000);
      result.current.form.setValue('categoryId', 'category-rent');
    });

    let firstSubmit!: Promise<void>;
    let secondSubmit!: Promise<void>;
    await act(() => {
      firstSubmit = result.current.onSubmit();
      secondSubmit = result.current.onSubmit();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(addCommitmentMock).toHaveBeenCalledTimes(1);

    save.resolve();
    await act(async () => {
      await Promise.all([firstSubmit, secondSubmit]);
    });

    expect(addCommitmentMock).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  describe('a failed add', () => {
    async function mountFilled() {
      const { result } = await renderHook(() => useAddCommitment({ onSaved }));
      await act(() => {
        result.current.form.setValue('name', 'Rent');
        result.current.form.setValue('amount', 5000);
        result.current.form.setValue('categoryId', 'category-rent');
      });
      return result;
    }

    it('sets the save error, stays on the add screen and keeps the form', async () => {
      addCommitmentMock.mockRejectedValueOnce(new Error('insert failed'));
      const result = await mountFilled();

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(addCommitmentMock).toHaveBeenCalledTimes(1);
      expect(setSaveErrorMock).toHaveBeenLastCalledWith(Strings.commitmentsSaveError);
      expect(onSaved).not.toHaveBeenCalled();
      expect(result.current.form.getValues('name')).toBe('Rent');
      expect(result.current.form.getValues('amount')).toBe(5000);
    });

    it('clears the save error before the next add is called', async () => {
      addCommitmentMock.mockRejectedValueOnce(new Error('insert failed'));
      const result = await mountFilled();
      await act(async () => {
        await result.current.onSubmit();
      });
      setSaveErrorMock.mockClear();
      addCommitmentMock.mockClear();

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(setSaveErrorMock).toHaveBeenCalledWith(undefined);
      expect(addCommitmentMock).toHaveBeenCalledTimes(1);
      expect(setSaveErrorMock.mock.invocationCallOrder[0]).toBeLessThan(
        addCommitmentMock.mock.invocationCallOrder[0],
      );
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    it('returns the state save error for the form to show', async () => {
      saveErrorValue = Strings.commitmentsSaveError;
      setup();

      const { result } = await renderHook(() => useAddCommitment({ onSaved }));

      expect(result.current.state.saveError).toBe(Strings.commitmentsSaveError);
    });
  });

  describe('resetDraft', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-10-22T12:00:00') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('clears a failed draft to the add defaults of the day it runs on', async () => {
      addCommitmentMock.mockRejectedValueOnce(new Error('insert failed'));
      const { result } = await renderHook(() => useAddCommitment({ onSaved }));
      expect(result.current.form.getValues('startDate')).toBe('2026-10-22');
      await act(() => {
        result.current.form.setValue('name', 'Rent');
        result.current.form.setValue('amount', 5000);
        result.current.form.setValue('categoryId', 'category-rent');
      });
      await act(async () => {
        await result.current.onSubmit();
      });
      expect(setSaveErrorMock).toHaveBeenLastCalledWith(Strings.commitmentsSaveError);
      resetStateMock.mockClear();

      jest.setSystemTime(new Date('2026-10-23T12:00:00'));
      await act(() => result.current.resetDraft());

      expect(result.current.form.getValues('name')).toBe('');
      expect(result.current.form.getValues('startDate')).toBe('2026-10-23');
      expect(resetStateMock).toHaveBeenCalledTimes(1);
      expect(onSaved).not.toHaveBeenCalled();
    });
  });
});
