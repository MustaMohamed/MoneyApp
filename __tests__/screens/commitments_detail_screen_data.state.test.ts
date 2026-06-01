import { act, renderHook } from '@testing-library/react-native';

import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { useCommitmentDetailScreenData } from '@/modules/commitments/screens/commitments/detail/detail.state';

describe('useCommitmentDetailScreenData', () => {
  it('starts with viewState loading and empty allPayments', () => {
    const { result } = renderHook(() => useCommitmentDetailScreenData());

    expect(result.current.state.viewState.value).toBe('loading');
    expect(result.current.state.allPayments.value).toEqual([]);
  });

  it('setViewState updates to notFound', () => {
    const { result } = renderHook(() => useCommitmentDetailScreenData());

    act(() => result.current.setViewState('notFound'));

    expect(result.current.state.viewState.value).toBe('notFound');
  });

  it('setViewState updates to ready', () => {
    const { result } = renderHook(() => useCommitmentDetailScreenData());

    act(() => result.current.setViewState('ready'));

    expect(result.current.state.viewState.value).toBe('ready');
  });

  it('setAllPayments updates allPayments', () => {
    const payments = [{ id: 'pay-1' }] as CommitmentPayment[];
    const { result } = renderHook(() => useCommitmentDetailScreenData());

    act(() => result.current.setAllPayments(payments));

    expect(result.current.state.allPayments.value).toEqual(payments);
  });

  it('reset returns viewState to loading and clears allPayments', () => {
    const { result } = renderHook(() => useCommitmentDetailScreenData());

    act(() => {
      result.current.setViewState('ready');
      result.current.setAllPayments([{ id: 'pay-1' }] as CommitmentPayment[]);
      result.current.reset();
    });

    expect(result.current.state.viewState.value).toBe('loading');
    expect(result.current.state.allPayments.value).toEqual([]);
  });
});
