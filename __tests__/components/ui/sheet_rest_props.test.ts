import { resolveSheetClosedAtRestProps } from '@/components/ui/sheet';
import {
  createSheetCloseLifecycle,
  settleSheetCloseLifecycle,
  syncSheetCloseLifecycle,
} from '@/components/ui/sheet_close_lifecycle';

const HIDDEN = { opacity: 0, pointerEvents: 'none' };
const SHOWN = { opacity: 1, pointerEvents: 'box-none' };

function openedThenClosing() {
  const opened = syncSheetCloseLifecycle(createSheetCloseLifecycle(false), true);
  return syncSheetCloseLifecycle(opened, false);
}

describe('resolveSheetClosedAtRestProps', () => {
  it('hides a sheet that never opened', () => {
    const mounted = createSheetCloseLifecycle(false);

    expect(resolveSheetClosedAtRestProps(mounted)).toEqual(HIDDEN);
    expect(resolveSheetClosedAtRestProps(syncSheetCloseLifecycle(mounted, false))).toEqual(HIDDEN);
  });

  it('shows an open sheet', () => {
    const mountedOpen = createSheetCloseLifecycle(true);
    const openedLater = syncSheetCloseLifecycle(createSheetCloseLifecycle(false), true);

    expect(resolveSheetClosedAtRestProps(mountedOpen)).toEqual(SHOWN);
    expect(resolveSheetClosedAtRestProps(openedLater)).toEqual(SHOWN);
  });

  it('shows a closing sheet until its close settles', () => {
    const closing = openedThenClosing();
    const stillAnimating = settleSheetCloseLifecycle(closing, 0);

    expect(resolveSheetClosedAtRestProps(closing)).toEqual(SHOWN);
    expect(stillAnimating.shouldComplete).toBe(false);
    expect(resolveSheetClosedAtRestProps(stillAnimating.lifecycle)).toEqual(SHOWN);
  });

  it('hides a sheet whose close settled at -1, and on the render after it', () => {
    const settled = settleSheetCloseLifecycle(openedThenClosing(), -1);

    expect(settled.shouldComplete).toBe(true);
    expect(resolveSheetClosedAtRestProps(settled.lifecycle)).toEqual(HIDDEN);
    expect(
      resolveSheetClosedAtRestProps(syncSheetCloseLifecycle(settled.lifecycle, false)),
    ).toEqual(HIDDEN);
  });

  it('shows a reopened sheet, and keeps it shown on a stale -1', () => {
    const settled = settleSheetCloseLifecycle(openedThenClosing(), -1).lifecycle;
    const reopened = syncSheetCloseLifecycle(settled, true);
    const staleClose = settleSheetCloseLifecycle(reopened, -1);

    expect(resolveSheetClosedAtRestProps(reopened)).toEqual(SHOWN);
    expect(staleClose.shouldComplete).toBe(false);
    expect(resolveSheetClosedAtRestProps(staleClose.lifecycle)).toEqual(SHOWN);
  });
});
