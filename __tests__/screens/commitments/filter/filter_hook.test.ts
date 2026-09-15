import { act, renderHook } from '@testing-library/react-native';

import { AmountType, Currency, RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCommitmentsScreenState } from '@/modules/commitments/screens/commitments/commitments.state';
import { useCommitmentFilterSheet } from '@/modules/commitments/screens/commitments/filter/filter.hook';
import {
  EMPTY_COMMITMENT_FILTERS,
  useCommitmentFilterStore,
} from '@/modules/commitments/screens/commitments/filter/filter.store';
import { makeTestAccount } from '@/test_helpers/transaction';

beforeEach(() => {
  useCommitmentFilterStore.getState().resetDraft();
  useCommitmentsScreenState.getState().reset();
  useAccountStore.getState().reset();
});

describe('useCommitmentFilterSheet', () => {
  it('names a blank-named account "Unnamed account" in the draft account summary', async () => {
    useAccountStore.setState({
      accounts: [
        makeTestAccount({ id: 'a1', name: '' }),
        makeTestAccount({ id: 'a2', name: 'Wallet' }),
      ],
    });
    const { result } = await renderHook(() => useCommitmentFilterSheet());
    expect(result.current.state.accountSummary).toBe(Strings.filterSummaryAccountsEmpty);

    await act(() => result.current.toggleAccountId('a1'));
    await act(() => result.current.toggleAccountId('a2'));

    expect(result.current.state.accountSummary).toBe(`${Strings.unnamedAccount}, Wallet`);
  });

  it('disables Apply when draft and applied filters match', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    expect(result.current.state.canApply).toBe(false);
  });

  it('enables Apply when amount type or recurrence filters change', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => result.current.toggleAmountType(AmountType.Variable));
    expect(result.current.state.draftCount).toBe(1);
    expect(result.current.state.canApply).toBe(true);

    await act(() => result.current.toggleRecurrencePreset(RecurrencePreset.Monthly));
    expect(result.current.state.draftCount).toBe(2);
  });

  it('allows Reset then Apply to clear already-applied filters', async () => {
    useCommitmentsScreenState.getState().setAppliedFilters({
      ...EMPTY_COMMITMENT_FILTERS,
      categoryIds: ['cat-rent'],
    });
    useCommitmentFilterStore.getState().setDraft({
      ...EMPTY_COMMITMENT_FILTERS,
      categoryIds: ['cat-rent'],
    });

    const { result } = await renderHook(() => useCommitmentFilterSheet());
    expect(result.current.state.canApply).toBe(false);

    await act(() => result.current.resetDraft());
    expect(result.current.state.draft).toEqual(EMPTY_COMMITMENT_FILTERS);
    expect(result.current.state.canApply).toBe(true);

    await act(() => result.current.applyDraft());
    expect(useCommitmentsScreenState.getState().appliedFilters).toEqual(EMPTY_COMMITMENT_FILTERS);
  });

  it('tracks amount currency only when amount range is active', async () => {
    const { result } = await renderHook(() => useCommitmentFilterSheet());

    await act(() => result.current.setAmountCurrency(Currency.USD));
    expect(result.current.state.canApply).toBe(false);

    await act(() => result.current.setAmountMin(100));
    expect(result.current.state.canApply).toBe(true);
  });
});
