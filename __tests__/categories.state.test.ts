import { useCategoriesScreenState } from '@/screens/settings/categories/categories.state';

beforeEach(() => useCategoriesScreenState.getState().reset());

describe('useCategoriesScreenState', () => {
  it('starts with activeTab=expense and all sheets hidden', () => {
    const s = useCategoriesScreenState.getState().state;
    expect(s.activeTab).toBe('expense');
    expect(s.showAddSheet).toBe(false);
    expect(s.showDeleteConfirm).toBe(false);
    expect(s.showReassignSheet).toBe(false);
  });

  it('setActiveTab switches between expense and income', () => {
    useCategoriesScreenState.getState().setActiveTab('income');
    expect(useCategoriesScreenState.getState().state.activeTab).toBe('income');
    useCategoriesScreenState.getState().setActiveTab('expense');
    expect(useCategoriesScreenState.getState().state.activeTab).toBe('expense');
  });

  it('setShowAddSheet toggles', () => {
    useCategoriesScreenState.getState().setShowAddSheet(true);
    expect(useCategoriesScreenState.getState().state.showAddSheet).toBe(true);
    useCategoriesScreenState.getState().setShowAddSheet(false);
    expect(useCategoriesScreenState.getState().state.showAddSheet).toBe(false);
  });

  it('setShowDeleteConfirm toggles', () => {
    useCategoriesScreenState.getState().setShowDeleteConfirm(true);
    expect(useCategoriesScreenState.getState().state.showDeleteConfirm).toBe(true);
    useCategoriesScreenState.getState().setShowDeleteConfirm(false);
    expect(useCategoriesScreenState.getState().state.showDeleteConfirm).toBe(false);
  });

  it('setShowReassignSheet toggles', () => {
    useCategoriesScreenState.getState().setShowReassignSheet(true);
    expect(useCategoriesScreenState.getState().state.showReassignSheet).toBe(true);
    useCategoriesScreenState.getState().setShowReassignSheet(false);
    expect(useCategoriesScreenState.getState().state.showReassignSheet).toBe(false);
  });

  it('reset returns to defaults', () => {
    useCategoriesScreenState.setState({
      state: {
        activeTab: 'income',
        showAddSheet: true,
        showDeleteConfirm: true,
        showReassignSheet: true,
      },
    });
    useCategoriesScreenState.getState().reset();
    const s = useCategoriesScreenState.getState().state;
    expect(s.activeTab).toBe('expense');
    expect(s.showAddSheet).toBe(false);
    expect(s.showDeleteConfirm).toBe(false);
    expect(s.showReassignSheet).toBe(false);
  });
});
