import { AmountType, CommitmentPaymentStatus, Currency, RecurrencePreset } from '@/constants/enums';
import { useCommitmentsScreenState } from '@/modules/commitments/screens/commitments/commitments.state';
import { EMPTY_COMMITMENT_FILTERS } from '@/modules/commitments/screens/commitments/filter/filter.store';
import { makeTestCommitment, makeTestMonthPayment } from '@/test_helpers/commitment';

beforeEach(() => useCommitmentsScreenState.getState().reset());

describe('useCommitmentsScreenState', () => {
  it('starts with refreshing false, statusFilter all, search empty, and no advanced filters', () => {
    const s = useCommitmentsScreenState.getState();
    expect(s.refreshing).toBe(false);
    expect(s.statusFilter).toBe('all');
    expect(s.searchQuery).toBe('');
    expect(s.appliedFilters).toEqual({
      accountIds: [],
      categoryIds: [],
      amountCurrency: Currency.EGP,
      amountTypes: [],
      recurrencePresets: [],
    });
  });

  it('setRefreshing updates refreshing', () => {
    useCommitmentsScreenState.getState().setRefreshing(true);
    expect(useCommitmentsScreenState.getState().refreshing).toBe(true);
  });

  it('setStatusFilter updates statusFilter', () => {
    useCommitmentsScreenState.getState().setStatusFilter(CommitmentPaymentStatus.Paid);
    expect(useCommitmentsScreenState.getState().statusFilter).toBe(CommitmentPaymentStatus.Paid);
  });

  it('sets and clears the search query', () => {
    useCommitmentsScreenState.getState().setSearchQuery('rent');
    expect(useCommitmentsScreenState.getState().searchQuery).toBe('rent');

    useCommitmentsScreenState.getState().clearSearch();
    expect(useCommitmentsScreenState.getState().searchQuery).toBe('');
  });

  it('sets applied advanced filters', () => {
    useCommitmentsScreenState.getState().setAppliedFilters({
      accountIds: ['account-1'],
      categoryIds: ['category-1'],
      amountCurrency: Currency.USD,
      amountTypes: [AmountType.Variable],
      recurrencePresets: [],
      amountMin: 25,
    });

    expect(useCommitmentsScreenState.getState().appliedFilters).toMatchObject({
      accountIds: ['account-1'],
      categoryIds: ['category-1'],
      amountCurrency: Currency.USD,
      amountTypes: [AmountType.Variable],
      amountMin: 25,
    });
  });

  it('holds the pay target, which starts empty, and reset clears it', () => {
    expect(useCommitmentsScreenState.getState().payTarget).toBeUndefined();
    const target = { payment: makeTestMonthPayment(), commitment: makeTestCommitment() };

    useCommitmentsScreenState.getState().setPayTarget(target);
    expect(useCommitmentsScreenState.getState().payTarget).toBe(target);

    useCommitmentsScreenState.getState().reset();
    expect(useCommitmentsScreenState.getState().payTarget).toBeUndefined();
  });

  it('reset returns to initial state', () => {
    useCommitmentsScreenState.getState().setRefreshing(true);
    useCommitmentsScreenState.getState().setSearchQuery('rent');
    useCommitmentsScreenState.getState().reset();
    expect(useCommitmentsScreenState.getState().refreshing).toBe(false);
    expect(useCommitmentsScreenState.getState().searchQuery).toBe('');
    expect(useCommitmentsScreenState.getState().appliedFilters.accountIds).toEqual([]);
  });

  it('seedCommitmentFilter clears the search, the rail, every other filter and a lit chip in one notification', () => {
    const state = useCommitmentsScreenState.getState();
    state.setSearchQuery('rent');
    state.setStatusFilter(CommitmentPaymentStatus.Paid);
    state.setAppliedFilters({
      accountIds: ['account-1'],
      categoryIds: ['category-1'],
      amountCurrency: Currency.USD,
      amountTypes: [AmountType.Variable],
      recurrencePresets: [RecurrencePreset.Monthly],
      amountMin: 25,
      amountMax: 50,
      commitmentId: 'commitment-old',
    });
    const listener = jest.fn();
    const unsubscribe = useCommitmentsScreenState.subscribe(listener);

    useCommitmentsScreenState.getState().seedCommitmentFilter('commitment-1');
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
    const seeded = useCommitmentsScreenState.getState();
    expect(seeded.searchQuery).toBe('');
    expect(seeded.statusFilter).toBe('all');
    expect(seeded.appliedFilters).toEqual({
      ...EMPTY_COMMITMENT_FILTERS,
      commitmentId: 'commitment-1',
    });
  });
});
