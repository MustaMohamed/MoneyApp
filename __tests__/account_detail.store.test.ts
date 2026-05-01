import { act } from 'react';
import { create } from 'zustand';

import { createAccountDetailStore } from '@/app/(app)/accounts/[id]/account_detail.store';

jest.mock('zustand', () => ({ create: jest.requireActual('zustand').create }));

describe('accountDetailStore initial state', () => {
  it('starts with all booleans false', () => {
    const store = createAccountDetailStore();
    expect(store.getState().isEditing).toBe(false);
    expect(store.getState().isAdjustVisible).toBe(false);
    expect(store.getState().isArchiveVisible).toBe(false);
  });
});

describe('accountDetailStore.setEditing', () => {
  it('sets isEditing to true', () => {
    const store = createAccountDetailStore();
    store.getState().setEditing(true);
    expect(store.getState().isEditing).toBe(true);
  });

  it('sets isEditing back to false', () => {
    const store = createAccountDetailStore();
    store.getState().setEditing(true);
    store.getState().setEditing(false);
    expect(store.getState().isEditing).toBe(false);
  });
});

describe('accountDetailStore.setAdjustVisible', () => {
  it('toggles isAdjustVisible', () => {
    const store = createAccountDetailStore();
    store.getState().setAdjustVisible(true);
    expect(store.getState().isAdjustVisible).toBe(true);
    store.getState().setAdjustVisible(false);
    expect(store.getState().isAdjustVisible).toBe(false);
  });
});

describe('accountDetailStore.setArchiveVisible', () => {
  it('toggles isArchiveVisible', () => {
    const store = createAccountDetailStore();
    store.getState().setArchiveVisible(true);
    expect(store.getState().isArchiveVisible).toBe(true);
  });
});

describe('accountDetailStore.reset', () => {
  it('resets all state to false', () => {
    const store = createAccountDetailStore();
    store.getState().setEditing(true);
    store.getState().setAdjustVisible(true);
    store.getState().setArchiveVisible(true);
    store.getState().reset();
    expect(store.getState().isEditing).toBe(false);
    expect(store.getState().isAdjustVisible).toBe(false);
    expect(store.getState().isArchiveVisible).toBe(false);
  });
});
