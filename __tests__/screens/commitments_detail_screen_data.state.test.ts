/**
 * Tests for the useCommitmentDetailScreenData store relocated from
 * detail.hook.ts into detail.state.ts as part of the Fix 1 CLAUDE.md
 * anatomy refactor. Verifies the store is exported and behaves correctly.
 */

import { useCommitmentDetailScreenData } from '@/modules/commitments/screens/commitments/detail/detail.state';

beforeEach(() => useCommitmentDetailScreenData.getState().reset());

describe('useCommitmentDetailScreenData (relocated store)', () => {
  it('is exported and accessible via getState()', () => {
    expect(typeof useCommitmentDetailScreenData.getState).toBe('function');
  });

  it('starts with viewState = loading and empty allPayments', () => {
    const s = useCommitmentDetailScreenData.getState().state;
    expect(s.viewState).toBe('loading');
    expect(s.allPayments).toEqual([]);
  });

  it('setViewState updates to notFound', () => {
    useCommitmentDetailScreenData.getState().setViewState('notFound');
    expect(useCommitmentDetailScreenData.getState().state.viewState).toBe('notFound');
  });

  it('setViewState updates to ready', () => {
    useCommitmentDetailScreenData.getState().setViewState('ready');
    expect(useCommitmentDetailScreenData.getState().state.viewState).toBe('ready');
  });

  it('setAllPayments updates allPayments', () => {
    const payments = [{ id: 'pay-1' } as any];
    useCommitmentDetailScreenData.getState().setAllPayments(payments);
    expect(useCommitmentDetailScreenData.getState().state.allPayments).toEqual(payments);
  });

  it('reset returns viewState to loading and clears allPayments', () => {
    useCommitmentDetailScreenData.getState().setViewState('ready');
    useCommitmentDetailScreenData.getState().setAllPayments([{ id: 'pay-1' } as any]);
    useCommitmentDetailScreenData.getState().reset();
    const s = useCommitmentDetailScreenData.getState().state;
    expect(s.viewState).toBe('loading');
    expect(s.allPayments).toEqual([]);
  });
});
