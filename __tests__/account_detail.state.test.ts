import { createAccountDetailState } from '@/modules/accounts/screens/accounts/detail/account_detail.state';

jest.mock('zustand', () => ({ create: jest.requireActual('zustand').create }));

describe('accountDetailState initial state', () => {
  it('starts with all booleans false', () => {
    const store = createAccountDetailState();
    const s = store.getState().state;
    expect(s.isEditing).toBe(false);
    expect(s.isAdjustVisible).toBe(false);
    expect(s.isArchiveVisible).toBe(false);
    expect(s.isSaving).toBe(false);
    expect(s.isAdjusting).toBe(false);
    expect(s.isArchiving).toBe(false);
  });
});

describe('accountDetailState setters', () => {
  it('setEditing toggles', () => {
    const store = createAccountDetailState();
    store.getState().setEditing(true);
    expect(store.getState().state.isEditing).toBe(true);
    store.getState().setEditing(false);
    expect(store.getState().state.isEditing).toBe(false);
  });

  it('setAdjustVisible toggles', () => {
    const store = createAccountDetailState();
    store.getState().setAdjustVisible(true);
    expect(store.getState().state.isAdjustVisible).toBe(true);
    store.getState().setAdjustVisible(false);
    expect(store.getState().state.isAdjustVisible).toBe(false);
  });

  it('setArchiveVisible toggles', () => {
    const store = createAccountDetailState();
    store.getState().setArchiveVisible(true);
    expect(store.getState().state.isArchiveVisible).toBe(true);
  });

  it('setSaving toggles', () => {
    const store = createAccountDetailState();
    store.getState().setSaving(true);
    expect(store.getState().state.isSaving).toBe(true);
    store.getState().setSaving(false);
    expect(store.getState().state.isSaving).toBe(false);
  });

  it('setAdjusting toggles', () => {
    const store = createAccountDetailState();
    store.getState().setAdjusting(true);
    expect(store.getState().state.isAdjusting).toBe(true);
    store.getState().setAdjusting(false);
    expect(store.getState().state.isAdjusting).toBe(false);
  });

  it('setArchiving toggles', () => {
    const store = createAccountDetailState();
    store.getState().setArchiving(true);
    expect(store.getState().state.isArchiving).toBe(true);
    store.getState().setArchiving(false);
    expect(store.getState().state.isArchiving).toBe(false);
  });
});

describe('accountDetailState reset', () => {
  it('resets every flag to false', () => {
    const store = createAccountDetailState();
    store.getState().setEditing(true);
    store.getState().setAdjustVisible(true);
    store.getState().setArchiveVisible(true);
    store.getState().setSaving(true);
    store.getState().setAdjusting(true);
    store.getState().setArchiving(true);
    store.getState().reset();
    const s = store.getState().state;
    expect(s.isEditing).toBe(false);
    expect(s.isAdjustVisible).toBe(false);
    expect(s.isArchiveVisible).toBe(false);
    expect(s.isSaving).toBe(false);
    expect(s.isAdjusting).toBe(false);
    expect(s.isArchiving).toBe(false);
  });
});
