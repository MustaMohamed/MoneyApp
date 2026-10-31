import { act, renderHook, waitFor } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { useSkipWithUndo } from '@/modules/commitments/screens/commitments/skip_with_undo.hook';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

const mockToast = { show: jest.fn() };

// The wrapper, not HeroUI, so `show` sees exactly what the call site passed.
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: mockToast, isToastVisible: false }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));

const PAYMENT_ID = 'payment-1';
const NAME = 'Rent';
const skipPaymentMock = jest.fn<Promise<void>, [string]>();
const undoSkipMock = jest.fn<Promise<void>, [string]>();
let transitioningPaymentIds: string[] = [];

const SKIPPED_TOAST = {
  label: 'Rent skipped',
  variant: 'success',
  actionLabel: 'Undo',
  onActionPress: expect.any(Function),
};

interface ToastHelpers {
  show: jest.Mock;
  hide: jest.Mock;
}

function pressUndo(): Promise<void> | void {
  const options = mockToast.show.mock.calls[0]?.[0] as {
    onActionPress: (helpers: ToastHelpers) => Promise<void> | void;
  };
  return options.onActionPress({ show: jest.fn(), hide: jest.fn() });
}

beforeEach(() => {
  mockToast.show.mockClear();
  skipPaymentMock.mockReset().mockResolvedValue(undefined);
  undoSkipMock.mockReset().mockResolvedValue(undefined);
  transitioningPaymentIds = [];
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    get transitioningPaymentIds() {
      return transitioningPaymentIds;
    },
    skipPayment: skipPaymentMock,
    undoSkip: undoSkipMock,
  }));
});

describe('useSkipWithUndo', () => {
  it('a skip writes once and shows one toast with the action', async () => {
    const { result } = await renderHook(() => useSkipWithUndo());

    await act(() => result.current.skip(PAYMENT_ID, NAME));

    expect(skipPaymentMock).toHaveBeenCalledTimes(1);
    expect(skipPaymentMock).toHaveBeenCalledWith(PAYMENT_ID);
    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(SKIPPED_TOAST);
  });

  it('a skip on an id in transition writes nothing and shows nothing', async () => {
    transitioningPaymentIds = [PAYMENT_ID];
    const { result } = await renderHook(() => useSkipWithUndo());

    await act(() => result.current.skip(PAYMENT_ID, NAME));

    expect(skipPaymentMock).not.toHaveBeenCalled();
    expect(mockToast.show).not.toHaveBeenCalled();
  });

  it('reads the transition at call time, not at render', async () => {
    const { result } = await renderHook(() => useSkipWithUndo());
    transitioningPaymentIds = [PAYMENT_ID];

    await act(() => result.current.skip(PAYMENT_ID, NAME));

    expect(skipPaymentMock).not.toHaveBeenCalled();
  });

  it('a failed skip shows the danger toast, no action toast, and does not reject', async () => {
    skipPaymentMock.mockRejectedValueOnce(new Error('write failed'));
    const { result } = await renderHook(() => useSkipWithUndo());

    await act(async () => {
      await expect(result.current.skip(PAYMENT_ID, NAME)).resolves.toBeUndefined();
    });

    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith({
      label: Strings.commitmentsSkipError,
      variant: 'danger',
    });
  });

  it('Undo clears the skip once and shows no second toast', async () => {
    const { result } = await renderHook(() => useSkipWithUndo());
    await act(() => result.current.skip(PAYMENT_ID, NAME));

    await act(async () => {
      await pressUndo();
    });

    expect(undoSkipMock).toHaveBeenCalledTimes(1);
    expect(undoSkipMock).toHaveBeenCalledWith(PAYMENT_ID);
    expect(mockToast.show).toHaveBeenCalledTimes(1);
  });

  it('a failed Undo shows its danger toast', async () => {
    undoSkipMock.mockRejectedValueOnce(new Error('write failed'));
    const { result } = await renderHook(() => useSkipWithUndo());
    await act(() => result.current.skip(PAYMENT_ID, NAME));

    await act(async () => {
      await pressUndo();
    });

    await waitFor(() => expect(mockToast.show).toHaveBeenCalledTimes(2));
    expect(mockToast.show).toHaveBeenLastCalledWith({
      label: Strings.commitmentsUndoSkipError,
      variant: 'danger',
    });
  });

  it('Undo on an id in transition does nothing', async () => {
    const { result } = await renderHook(() => useSkipWithUndo());
    await act(() => result.current.skip(PAYMENT_ID, NAME));
    transitioningPaymentIds = [PAYMENT_ID];

    await act(async () => {
      await pressUndo();
    });

    expect(undoSkipMock).not.toHaveBeenCalled();
    expect(mockToast.show).toHaveBeenCalledTimes(1);
  });

  it('showSkippedToast shows the toast with no write, and its Undo clears the skip', async () => {
    const { result } = await renderHook(() => useSkipWithUndo());

    await act(async () => result.current.showSkippedToast(PAYMENT_ID, NAME));

    expect(skipPaymentMock).not.toHaveBeenCalled();
    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(SKIPPED_TOAST);

    await act(async () => {
      await pressUndo();
    });

    expect(undoSkipMock).toHaveBeenCalledWith(PAYMENT_ID);
  });
});
