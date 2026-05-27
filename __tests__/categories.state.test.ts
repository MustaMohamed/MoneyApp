import { CategoryType } from '@/constants/enums';
import { useCategoriesScreenState } from '@/modules/categories/screens/settings/categories/categories.state';

beforeEach(() => useCategoriesScreenState.getState().reset());

describe('useCategoriesScreenState', () => {
  it('starts with activeTab=expense and all sheets hidden', () => {
    const s = useCategoriesScreenState.getState();
    expect(s.activeTab).toBe(CategoryType.Expense);
    expect(s.showAddSheet).toBe(false);
    expect(s.showDeleteConfirm).toBe(false);
    expect(s.showReassignSheet).toBe(false);
  });

  it('setActiveTab switches between expense and income', () => {
    useCategoriesScreenState.getState().setActiveTab(CategoryType.Income);
    expect(useCategoriesScreenState.getState().activeTab).toBe(CategoryType.Income);
    useCategoriesScreenState.getState().setActiveTab(CategoryType.Expense);
    expect(useCategoriesScreenState.getState().activeTab).toBe(CategoryType.Expense);
  });

  it('setShowAddSheet toggles', () => {
    useCategoriesScreenState.getState().setShowAddSheet(true);
    expect(useCategoriesScreenState.getState().showAddSheet).toBe(true);
    useCategoriesScreenState.getState().setShowAddSheet(false);
    expect(useCategoriesScreenState.getState().showAddSheet).toBe(false);
  });

  it('setShowDeleteConfirm toggles', () => {
    useCategoriesScreenState.getState().setShowDeleteConfirm(true);
    expect(useCategoriesScreenState.getState().showDeleteConfirm).toBe(true);
    useCategoriesScreenState.getState().setShowDeleteConfirm(false);
    expect(useCategoriesScreenState.getState().showDeleteConfirm).toBe(false);
  });

  it('setShowReassignSheet toggles', () => {
    useCategoriesScreenState.getState().setShowReassignSheet(true);
    expect(useCategoriesScreenState.getState().showReassignSheet).toBe(true);
    useCategoriesScreenState.getState().setShowReassignSheet(false);
    expect(useCategoriesScreenState.getState().showReassignSheet).toBe(false);
  });

  it('reset returns to defaults', () => {
    useCategoriesScreenState.setState({
      activeTab: CategoryType.Income,
      showAddSheet: true,
      showDeleteConfirm: true,
      showReassignSheet: true,
      isDeleting: true,
    });
    useCategoriesScreenState.getState().reset();
    const s = useCategoriesScreenState.getState();
    expect(s.activeTab).toBe(CategoryType.Expense);
    expect(s.showAddSheet).toBe(false);
    expect(s.showDeleteConfirm).toBe(false);
    expect(s.showReassignSheet).toBe(false);
    expect(s.isDeleting).toBe(false);
  });
});
