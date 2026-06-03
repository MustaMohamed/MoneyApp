import { renderHook } from '@testing-library/react-native';
import { act } from '@testing-library/react-native';

import {
  sheetVisibilityStore,
  useAnySheetOpen,
  useSheetVisibilityStore,
} from '@/store/sheet_visibility.store';

beforeEach(() => {
  sheetVisibilityStore.reset();
});

describe('useSheetVisibilityStore', () => {
  it('initialises with count = 0', () => {
    expect(sheetVisibilityStore.count).toBe(0);
    expect(sheetVisibilityStore.anyOpen).toBe(false);
  });

  it('increment increases the count by 1', () => {
    sheetVisibilityStore.increment();
    expect(sheetVisibilityStore.count).toBe(1);
    expect(sheetVisibilityStore.anyOpen).toBe(true);
  });

  it('increment is additive — multiple calls stack correctly', () => {
    sheetVisibilityStore.increment();
    sheetVisibilityStore.increment();
    expect(sheetVisibilityStore.count).toBe(2);
    expect(sheetVisibilityStore.anyOpen).toBe(true);
  });

  it('decrement decreases the count by 1', () => {
    sheetVisibilityStore.increment();
    sheetVisibilityStore.decrement();
    expect(sheetVisibilityStore.count).toBe(0);
    expect(sheetVisibilityStore.anyOpen).toBe(false);
  });

  it('decrement does not go below 0 and warns in dev (guard against leaked decrements)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    sheetVisibilityStore.decrement();
    expect(sheetVisibilityStore.count).toBe(0);
    expect(sheetVisibilityStore.anyOpen).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[sheet_visibility]'));
    warnSpy.mockRestore();
  });

  it('stacked sheets: increment twice, decrement twice → count reaches 0', () => {
    sheetVisibilityStore.increment();
    sheetVisibilityStore.increment();
    sheetVisibilityStore.decrement();
    expect(sheetVisibilityStore.count).toBe(1);
    expect(sheetVisibilityStore.anyOpen).toBe(true);
    sheetVisibilityStore.decrement();
    expect(sheetVisibilityStore.count).toBe(0);
    expect(sheetVisibilityStore.anyOpen).toBe(false);
  });

  it('reset() returns count to 0 from any value', () => {
    sheetVisibilityStore.increment();
    sheetVisibilityStore.increment();
    sheetVisibilityStore.increment();
    expect(sheetVisibilityStore.count).toBe(3);
    sheetVisibilityStore.reset();
    expect(sheetVisibilityStore.count).toBe(0);
    expect(sheetVisibilityStore.anyOpen).toBe(false);
  });

  it('useSheetVisibilityStore returns the shared MobX singleton', () => {
    expect(useSheetVisibilityStore()).toBe(sheetVisibilityStore);
  });
});

describe('useAnySheetOpen', () => {
  it('returns false when count is 0', () => {
    const { result } = renderHook(() => useAnySheetOpen());
    expect(result.current).toBe(false);
  });

  it('returns true when count is 1', () => {
    const { result } = renderHook(() => useAnySheetOpen());
    act(() => {
      sheetVisibilityStore.increment();
    });
    expect(result.current).toBe(true);
  });

  it('returns true when count is greater than 1 (stacked sheets)', () => {
    const { result } = renderHook(() => useAnySheetOpen());
    act(() => {
      sheetVisibilityStore.increment();
      sheetVisibilityStore.increment();
    });
    expect(result.current).toBe(true);
  });

  it('returns false again after all sheets are closed', () => {
    const { result } = renderHook(() => useAnySheetOpen());
    act(() => {
      sheetVisibilityStore.increment();
    });
    expect(result.current).toBe(true);
    act(() => {
      sheetVisibilityStore.decrement();
    });
    expect(result.current).toBe(false);
  });
});
