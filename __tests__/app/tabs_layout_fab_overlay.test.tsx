import { render, act } from '@testing-library/react-native';
/**
 * tabs_layout_fab_overlay.test.tsx
 *
 * Regression guard for the FAB-vs-Sheet wiring in `app/(app)/(tabs)/_layout.tsx`.
 *
 * The FAB must be hidden when any Sheet is open. The mechanism:
 *   <FAB hidden={isSettingsRoute || anySheetOpen} ... />
 * where `anySheetOpen` is read from the global sheet-visibility store via
 * `useAnySheetOpen()`. The Sheet primitive increments/decrements that store
 * counter on visible transitions.
 *
 * If the OR is dropped or refactored away (e.g. someone removes
 * `useAnySheetOpen()` from FABOverlay), the FAB returns to covering in-route
 * sheet footers — the bug PR #79 originally fixed. These tests fail.
 */
import React from 'react';

import { useSheetVisibilityStore } from '@/store/sheet_visibility.store';

// expo-router pathname controls the existing settings-route hidden path.
let mockPathname = '/transactions';
jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  Tabs: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

// Stub FAB to expose its received `hidden` prop. We don't care about FAB
// internals here — only that the wiring passes the right value down.
const mockFabSpy = jest.fn();
jest.mock('@/components/ui/fab', () => ({
  FAB: (props: { hidden?: boolean }) => {
    mockFabSpy(props.hidden);
    return null;
  },
}));

import { FABOverlay } from '@/app/(app)/(tabs)/_layout';

beforeEach(() => {
  mockFabSpy.mockClear();
  mockPathname = '/transactions';
  useSheetVisibilityStore.getState().reset();
});

describe('FABOverlay × useAnySheetOpen wiring', () => {
  it('FAB receives hidden=false on a non-settings route with no sheet open', () => {
    render(<FABOverlay />);
    expect(mockFabSpy).toHaveBeenLastCalledWith(false);
  });

  it('FAB receives hidden=true on a settings route (existing behavior)', () => {
    mockPathname = '/settings/categories';
    render(<FABOverlay />);
    expect(mockFabSpy).toHaveBeenLastCalledWith(true);
  });

  it('FAB flips to hidden=true when sheet-visibility counter goes positive', () => {
    const { rerender } = render(<FABOverlay />);
    expect(mockFabSpy).toHaveBeenLastCalledWith(false);

    act(() => useSheetVisibilityStore.getState().increment());
    // Subscriber re-renders FABOverlay; force a flush by re-rendering.
    rerender(<FABOverlay />);
    expect(mockFabSpy).toHaveBeenLastCalledWith(true);
  });

  it('FAB flips back to hidden=false when counter returns to 0', () => {
    act(() => useSheetVisibilityStore.getState().increment());
    const { rerender } = render(<FABOverlay />);
    expect(mockFabSpy).toHaveBeenLastCalledWith(true);

    act(() => useSheetVisibilityStore.getState().decrement());
    rerender(<FABOverlay />);
    expect(mockFabSpy).toHaveBeenLastCalledWith(false);
  });

  it('FAB stays hidden if either condition holds (settings route AND sheet open)', () => {
    mockPathname = '/settings/categories';
    act(() => useSheetVisibilityStore.getState().increment());
    render(<FABOverlay />);
    expect(mockFabSpy).toHaveBeenLastCalledWith(true);
  });

  it('FAB stays hidden while counter > 1 (stacked sheets), un-hides at 0', () => {
    act(() => {
      useSheetVisibilityStore.getState().increment();
      useSheetVisibilityStore.getState().increment();
    });
    const { rerender } = render(<FABOverlay />);
    expect(mockFabSpy).toHaveBeenLastCalledWith(true);

    act(() => useSheetVisibilityStore.getState().decrement());
    rerender(<FABOverlay />);
    expect(mockFabSpy).toHaveBeenLastCalledWith(true); // 1 sheet still open

    act(() => useSheetVisibilityStore.getState().decrement());
    rerender(<FABOverlay />);
    expect(mockFabSpy).toHaveBeenLastCalledWith(false);
  });
});
