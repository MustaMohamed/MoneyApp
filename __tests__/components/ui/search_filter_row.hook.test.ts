import { act, renderHook } from '@testing-library/react-native';
import type { TextInput } from 'react-native';

import { useSearchFieldSheetFocus } from '@/components/ui/search_filter_row.hook';
import { useSheetVisibilityStore } from '@/components/ui/sheet_visibility.state';

async function mountSearchField() {
  const focus = jest.fn();
  const hook = await renderHook(() => useSearchFieldSheetFocus());
  hook.result.current.inputRef.current = { focus } as unknown as TextInput;
  return {
    focus,
    takeFocus: () => act(() => hook.result.current.handleFocus()),
    loseFocus: () => act(() => hook.result.current.handleBlur()),
  };
}

const openSheet = () => act(() => useSheetVisibilityStore.getState().increment());
const closeSheet = () => act(() => useSheetVisibilityStore.getState().decrement());

describe('useSearchFieldSheetFocus', () => {
  beforeEach(() => useSheetVisibilityStore.getState().reset());

  it('focuses the field once at close when it held focus at open and lost it while the sheet was up', async () => {
    const field = await mountSearchField();
    await field.takeFocus();
    await openSheet();
    await field.loseFocus();
    expect(field.focus).not.toHaveBeenCalled();

    await closeSheet();
    expect(field.focus).toHaveBeenCalledTimes(1);
  });

  it('never focuses a field that held no focus when the sheet opened', async () => {
    const neverFocused = await mountSearchField();
    await openSheet();
    await closeSheet();
    expect(neverFocused.focus).not.toHaveBeenCalled();

    const blurredBeforeOpen = await mountSearchField();
    await blurredBeforeOpen.takeFocus();
    await blurredBeforeOpen.loseFocus();
    await openSheet();
    await closeSheet();
    expect(blurredBeforeOpen.focus).not.toHaveBeenCalled();

    const focusedOnlyWhileOpen = await mountSearchField();
    await openSheet();
    await focusedOnlyWhileOpen.takeFocus();
    await focusedOnlyWhileOpen.loseFocus();
    await closeSheet();
    expect(focusedOnlyWhileOpen.focus).not.toHaveBeenCalled();
  });

  it('never focuses a field that still holds focus when the sheet closes', async () => {
    const field = await mountSearchField();
    await field.takeFocus();
    await openSheet();
    await closeSheet();

    expect(field.focus).not.toHaveBeenCalled();
  });

  it('waits for the last sheet to close when a second sheet opened over the first', async () => {
    const field = await mountSearchField();
    await field.takeFocus();
    await openSheet();
    await field.loseFocus();
    await openSheet();

    await closeSheet();
    expect(useSheetVisibilityStore.getState().count).toBe(1);
    expect(field.focus).not.toHaveBeenCalled();

    await closeSheet();
    expect(useSheetVisibilityStore.getState().count).toBe(0);
    expect(field.focus).toHaveBeenCalledTimes(1);
  });
});
