import { act, renderHook } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useAddCommitment } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.hook';
import { useAddCommitmentState } from '@/modules/commitments/screens/commitments/add_commitment/add_commitment.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

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
    setSaving: jest.fn(),
    reset: jest.fn(),
  }));
}

describe('useAddCommitment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useAddCommitment())).resolves.toBeDefined();
  });

  it('saving defaults to false', async () => {
    const { result } = await renderHook(() => useAddCommitment());
    expect(result.current.state.saving).toBe(false);
  });

  it('leaves payment generation to the commitment mutation owner', async () => {
    const { result } = await renderHook(() => useAddCommitment());
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
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  describe('MA-115 a half-typed amount after a refused Save', () => {
    const amountError = (result: { current: ReturnType<typeof useAddCommitment> }) =>
      result.current.form.getFieldState('amount').error?.message;

    async function mountRefused() {
      const { result } = await renderHook(() => useAddCommitment());
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
          held = holdStillTypingDecimal(result.current.form, 'amount', n, true, text);
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
        held = holdStillTypingDecimal(result.current.form, 'amount', 0.001, true, '0.001');
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
    const { result } = await renderHook(() => useAddCommitment());
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
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
