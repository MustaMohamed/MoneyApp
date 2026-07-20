import {
  createSheetCloseLifecycle,
  settleSheetCloseLifecycle,
  syncSheetCloseLifecycle,
} from '@/components/ui/sheet_close_lifecycle';

describe('sheet close lifecycle', () => {
  it('completes once after an opened sheet settles closed', () => {
    let lifecycle = createSheetCloseLifecycle(false);
    lifecycle = syncSheetCloseLifecycle(lifecycle, true);
    lifecycle = syncSheetCloseLifecycle(lifecycle, false);

    const first = settleSheetCloseLifecycle(lifecycle, -1);
    const duplicate = settleSheetCloseLifecycle(first.lifecycle, -1);

    expect(first.shouldComplete).toBe(true);
    expect(duplicate.shouldComplete).toBe(false);
  });

  it('ignores a stale close event after the sheet reopens', () => {
    let lifecycle = createSheetCloseLifecycle(true);
    lifecycle = syncSheetCloseLifecycle(lifecycle, false);
    lifecycle = syncSheetCloseLifecycle(lifecycle, true);

    const staleClose = settleSheetCloseLifecycle(lifecycle, -1);

    expect(staleClose.shouldComplete).toBe(false);
    const currentClose = settleSheetCloseLifecycle(
      syncSheetCloseLifecycle(staleClose.lifecycle, false),
      -1,
    );
    expect(currentClose.shouldComplete).toBe(true);
  });
});
