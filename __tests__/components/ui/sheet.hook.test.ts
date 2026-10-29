import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent } from 'react-native';

import {
  SHEET_HEADER_PADDING_BOTTOM,
  resolveSheetCloseHitSlop,
  resolveSheetClosedAtRestProps,
} from '@/components/ui/sheet.helpers';
import { useSheetCloseHitSlop, useSheetCloseLifecycle } from '@/components/ui/sheet.hook';
import {
  SHEET_CLOSE_RETRY_LIMIT,
  SHEET_CLOSE_RETRY_MS,
  isSheetClosePending,
} from '@/components/ui/sheet_close_lifecycle';
import { Size, touchFloorHitSlop } from '@/constants/theme';

const HIDDEN = { opacity: 0, pointerEvents: 'none' };
const SHOWN = { opacity: 1, pointerEvents: 'box-none' };

async function mountSheet(isOpen: boolean, { withHandler = true }: { withHandler?: boolean } = {}) {
  const onCloseComplete = jest.fn();
  let renders = 0;
  const hook = await renderHook(
    ({ open }: { open: boolean }) => {
      renders += 1;
      return useSheetCloseLifecycle(open, withHandler ? onCloseComplete : undefined);
    },
    { initialProps: { open: isOpen } },
  );
  return {
    onCloseComplete,
    renderCount: () => renders,
    drawn: () => resolveSheetClosedAtRestProps(hook.result.current.closeLifecycle),
    setOpen: (open: boolean) => hook.rerender({ open }),
    settleAt: (index: number) => act(() => hook.result.current.handleSheetIndexChange(index)),
    settleTwiceBeforeARender: (index: number) =>
      act(() => {
        hook.result.current.handleSheetIndexChange(index);
        hook.result.current.handleSheetIndexChange(index);
      }),
    reportClosed: () => act(() => hook.result.current.handleSheetClosed()),
    requestClose: () => act(() => hook.result.current.handleSheetCloseRequest()),
    settleThenReportClosedBeforeARender: (index: number) =>
      act(() => {
        hook.result.current.handleSheetIndexChange(index);
        hook.result.current.handleSheetClosed();
      }),
  };
}

describe('useSheetCloseLifecycle', () => {
  it('hides a sheet that never opened', async () => {
    const sheet = await mountSheet(false);
    expect(sheet.drawn()).toEqual(HIDDEN);

    await sheet.setOpen(false);
    await sheet.settleAt(-1);
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();
  });

  it('shows an open sheet, mounted open or opened later', async () => {
    const mountedOpen = await mountSheet(true);
    expect(mountedOpen.drawn()).toEqual(SHOWN);

    const openedLater = await mountSheet(false);
    await openedLater.setOpen(true);
    expect(openedLater.drawn()).toEqual(SHOWN);
  });

  it('still shows a sheet whose isOpen dropped while its index has not reached -1', async () => {
    const sheet = await mountSheet(true);
    await sheet.setOpen(false);
    expect(sheet.drawn()).toEqual(SHOWN);

    await sheet.settleAt(0);
    expect(sheet.drawn()).toEqual(SHOWN);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();
  });

  it('hides the sheet on the render the settled close asks for, and completes once', async () => {
    const sheet = await mountSheet(true);
    await sheet.setOpen(false);
    await sheet.settleAt(-1);

    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);

    await sheet.settleAt(-1);
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);
  });

  it('completes once when a second -1 arrives before the render the first one asked for', async () => {
    const sheet = await mountSheet(true);
    await sheet.setOpen(false);
    await sheet.settleTwiceBeforeARender(-1);

    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);
    expect(sheet.drawn()).toEqual(HIDDEN);
  });

  it('shows a reopened sheet, keeps it shown on a stale -1, and completes its next close', async () => {
    const sheet = await mountSheet(true);
    await sheet.setOpen(false);
    await sheet.settleAt(-1);
    await sheet.setOpen(true);
    expect(sheet.drawn()).toEqual(SHOWN);

    await sheet.settleAt(-1);
    expect(sheet.drawn()).toEqual(SHOWN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);

    await sheet.setOpen(false);
    await sheet.settleAt(-1);
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(2);
  });

  it('renders nothing more for an index of 0 on an open sheet, and renders for the -1 that follows', async () => {
    const sheet = await mountSheet(true);
    const rendersAtOpen = sheet.renderCount();

    await sheet.settleAt(0);
    expect(sheet.renderCount()).toBe(rendersAtOpen);

    await sheet.settleAt(-1);
    expect(sheet.renderCount()).toBeGreaterThan(rendersAtOpen);
  });

  it('holds a reported open across a render that leaves isOpen alone, and completes once after the drop', async () => {
    const sheet = await mountSheet(true);
    await sheet.settleAt(0);
    await sheet.setOpen(true);
    await sheet.settleAt(-1);
    expect(sheet.drawn()).toEqual(SHOWN);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();

    await sheet.setOpen(false);
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);
  });
});

async function mountSheetReportingOpen(isOpen: boolean, reportsOpen = true) {
  const onOpenComplete = jest.fn();
  const hook = await renderHook(
    (props: { open: boolean; reportsOpen: boolean }) =>
      useSheetCloseLifecycle(props.open, undefined, props.reportsOpen ? onOpenComplete : undefined),
    { initialProps: { open: isOpen, reportsOpen } },
  );
  const settleAt = (index: number) => act(() => hook.result.current.handleSheetIndexChange(index));
  const setOpen = (open: boolean, nextReportsOpen = reportsOpen) =>
    hook.rerender({ open, reportsOpen: nextReportsOpen });
  return {
    onOpenComplete,
    settleAt,
    setOpen,
    requestClose: () => act(() => hook.result.current.handleSheetCloseRequest()),
    closeThenReopen: async () => {
      await setOpen(false);
      await settleAt(-1);
      await setOpen(true);
    },
  };
}

describe('useSheetCloseLifecycle, the settled open it reports', () => {
  it('calls onOpenComplete once for an index of 0 on an open sheet', async () => {
    const sheet = await mountSheetReportingOpen(true);
    expect(sheet.onOpenComplete).not.toHaveBeenCalled();

    await sheet.settleAt(0);
    expect(sheet.onOpenComplete).toHaveBeenCalledTimes(1);
  });

  it('calls nothing more for a second index of 0 or more in the same open', async () => {
    const sheet = await mountSheetReportingOpen(false);
    await sheet.setOpen(true);
    await sheet.settleAt(0);
    await sheet.settleAt(0);
    await sheet.settleAt(1);

    expect(sheet.onOpenComplete).toHaveBeenCalledTimes(1);
  });

  it('calls nothing for a close request on an open no index has reported, or for the 0 that follows it', async () => {
    const sheet = await mountSheetReportingOpen(true);
    await sheet.requestClose();
    await sheet.settleAt(0);
    expect(sheet.onOpenComplete).not.toHaveBeenCalled();

    await sheet.closeThenReopen();
    await sheet.settleAt(0);
    expect(sheet.onOpenComplete).toHaveBeenCalledTimes(1);
  });

  it('calls nothing for an index of 0 after isOpen dropped', async () => {
    const sheet = await mountSheetReportingOpen(true);
    await sheet.setOpen(false);
    await sheet.settleAt(0);
    expect(sheet.onOpenComplete).not.toHaveBeenCalled();

    await sheet.settleAt(-1);
    await sheet.setOpen(true);
    await sheet.settleAt(0);
    expect(sheet.onOpenComplete).toHaveBeenCalledTimes(1);
  });

  it('calls it again on the first index of a reopened sheet', async () => {
    const sheet = await mountSheetReportingOpen(true);
    await sheet.settleAt(0);
    await sheet.closeThenReopen();
    expect(sheet.onOpenComplete).toHaveBeenCalledTimes(1);

    await sheet.settleAt(0);
    expect(sheet.onOpenComplete).toHaveBeenCalledTimes(2);
  });

  it('throws nothing for an index of 0 with no handler passed, and calls one passed at the next open', async () => {
    const sheet = await mountSheetReportingOpen(true, false);
    await sheet.settleAt(0);
    expect(sheet.onOpenComplete).not.toHaveBeenCalled();

    await sheet.setOpen(false, true);
    await sheet.settleAt(-1);
    await sheet.setOpen(true, true);
    await sheet.settleAt(0);
    expect(sheet.onOpenComplete).toHaveBeenCalledTimes(1);
  });
});

describe.each([
  { sheet: 'a sheet with a close-complete handler', withHandler: true },
  { sheet: 'a sheet with no close-complete handler', withHandler: false },
])('useSheetCloseLifecycle, the orders a close settles in, on $sheet', ({ withHandler }) => {
  const completions = (count: number) => (withHandler ? count : 0);

  it('completes once after isOpen drops when the closed position was reported first, a render in between', async () => {
    const sheet = await mountSheet(false, { withHandler });
    await sheet.setOpen(true);
    await sheet.settleAt(0);
    await sheet.settleAt(-1);
    await sheet.setOpen(true);
    expect(sheet.drawn()).toEqual(SHOWN);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();

    await sheet.setOpen(false);
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));

    await sheet.settleAt(-1);
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));
  });

  it('completes once when the close is reported with no index change', async () => {
    const sheet = await mountSheet(false, { withHandler });
    await sheet.setOpen(true);
    await sheet.setOpen(false);
    expect(sheet.drawn()).toEqual(SHOWN);

    await sheet.reportClosed();
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));

    await sheet.reportClosed();
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));
  });

  it('completes once for a -1 after the drop and the closed report that follows it', async () => {
    const sheet = await mountSheet(true, { withHandler });
    await sheet.settleAt(0);
    await sheet.setOpen(false);
    await sheet.settleAt(-1);
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));

    await sheet.reportClosed();
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));
  });

  it('completes once when the -1 and the closed report arrive before a render', async () => {
    const sheet = await mountSheet(true, { withHandler });
    await sheet.settleAt(0);
    await sheet.setOpen(false);
    await sheet.settleThenReportClosedBeforeARender(-1);

    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));
  });

  it('keeps a reopened sheet shown on a stale closed report, completes nothing, then completes its next close', async () => {
    const sheet = await mountSheet(true, { withHandler });
    await sheet.setOpen(false);
    await sheet.settleAt(-1);
    await sheet.setOpen(true);
    expect(sheet.drawn()).toEqual(SHOWN);

    await sheet.reportClosed();
    expect(sheet.drawn()).toEqual(SHOWN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));

    await sheet.setOpen(false);
    await sheet.reportClosed();
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(2));
  });

  it('completes once for a sheet reopened mid-close whose only report before its -1 is a close request', async () => {
    const sheet = await mountSheet(true, { withHandler });
    await sheet.setOpen(false);
    await sheet.setOpen(true);
    const rendersAtReopen = sheet.renderCount();

    await sheet.requestClose();
    expect(sheet.renderCount()).toBe(rendersAtReopen);

    await sheet.settleAt(-1);
    await sheet.reportClosed();
    expect(sheet.drawn()).toEqual(SHOWN);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();

    await sheet.setOpen(false);
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));

    await sheet.settleAt(-1);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));
  });

  it('completes once when the -1 reaches an open sheet ahead of its close request', async () => {
    const sheet = await mountSheet(true, { withHandler });
    await sheet.settleAt(0);
    await sheet.settleAt(-1);
    await sheet.requestClose();
    expect(sheet.drawn()).toEqual(SHOWN);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();

    await sheet.setOpen(false);
    expect(sheet.drawn()).toEqual(HIDDEN);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));

    await sheet.settleAt(-1);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(completions(1));
  });

  it('renders nothing more for a close request on an open sheet whose open was reported, and keeps it shown', async () => {
    const sheet = await mountSheet(true, { withHandler });
    await sheet.settleAt(0);
    const rendersAtOpen = sheet.renderCount();

    await sheet.requestClose();
    expect(sheet.renderCount()).toBe(rendersAtOpen);
    expect(sheet.drawn()).toEqual(SHOWN);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();
  });
});

describe('useSheetCloseHitSlop', () => {
  const layoutOf = (height: number) =>
    ({ nativeEvent: { layout: { x: 0, y: 0, width: 411, height } } }) as LayoutChangeEvent;

  it('MA-242: before layout the close takes the slop of an unmeasured header, and after the header lays out the slop of its height', async () => {
    const headerHeight =
      SHEET_HEADER_PADDING_BOTTOM +
      Size.sheetCloseTrack +
      2 * touchFloorHitSlop(Size.sheetCloseTrack).top;
    expect(resolveSheetCloseHitSlop(headerHeight)).not.toEqual(resolveSheetCloseHitSlop(undefined));

    const hook = await renderHook(() => useSheetCloseHitSlop());
    expect(hook.result.current.hitSlop).toEqual(resolveSheetCloseHitSlop(undefined));

    await act(() => hook.result.current.onHeaderLayout(layoutOf(headerHeight)));
    expect(hook.result.current.hitSlop).toEqual(resolveSheetCloseHitSlop(headerHeight));
  });
});

// gorhom reports nothing for a close that ends back at the open index, so the sheet drives the close again.
describe('useSheetCloseLifecycle re-drives a close the sheet did not carry out (MA-244)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function mountRetryingSheet(isOpen: boolean, { withRetry = true } = {}) {
    const onCloseComplete = jest.fn();
    const retryClose = jest.fn();
    const hook = await renderHook(
      ({ open }: { open: boolean }) =>
        useSheetCloseLifecycle(
          open,
          onCloseComplete,
          undefined,
          withRetry ? retryClose : undefined,
        ),
      { initialProps: { open: isOpen } },
    );
    return {
      onCloseComplete,
      retryClose,
      pending: () => isSheetClosePending(hook.result.current.closeLifecycle),
      setOpen: (open: boolean) => hook.rerender({ open }),
      settleAt: (index: number) => act(() => hook.result.current.handleSheetIndexChange(index)),
      tick: (ms: number) => act(() => jest.advanceTimersByTime(ms)),
      unmount: () => hook.unmount(),
    };
  }

  it('calls retryClose once per SHEET_CLOSE_RETRY_MS after the drop while no -1 arrives', async () => {
    const sheet = await mountRetryingSheet(true);
    await sheet.settleAt(0);
    await sheet.setOpen(false);
    expect(sheet.pending()).toBe(true);

    await sheet.tick(SHEET_CLOSE_RETRY_MS - 1);
    expect(sheet.retryClose).not.toHaveBeenCalled();

    await sheet.tick(1);
    expect(sheet.retryClose).toHaveBeenCalledTimes(1);

    await sheet.tick(SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(2);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();
  });

  it('completes once on a -1 after two retries, and retries no more', async () => {
    const sheet = await mountRetryingSheet(true);
    await sheet.settleAt(0);
    await sheet.setOpen(false);
    await sheet.tick(2 * SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(2);

    await sheet.settleAt(-1);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);
    expect(sheet.pending()).toBe(false);

    await sheet.tick(5 * SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(2);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);
  });

  it('stops retrying on a reopen before the -1, never completes that close, and completes the next close once', async () => {
    const sheet = await mountRetryingSheet(true);
    await sheet.settleAt(0);
    await sheet.setOpen(false);
    await sheet.tick(SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(1);

    await sheet.setOpen(true);
    expect(sheet.pending()).toBe(false);
    await sheet.tick(3 * SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(1);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();

    await sheet.settleAt(0);
    await sheet.setOpen(false);
    await sheet.settleAt(-1);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);
    await sheet.tick(3 * SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(1);
  });

  it('settles a close asked for before any index report after SHEET_CLOSE_RETRY_LIMIT retries, once, and retries no more', async () => {
    const sheet = await mountRetryingSheet(true);
    await sheet.setOpen(false);

    await sheet.tick(SHEET_CLOSE_RETRY_LIMIT * SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(SHEET_CLOSE_RETRY_LIMIT);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();

    await sheet.tick(SHEET_CLOSE_RETRY_MS);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);
    expect(sheet.pending()).toBe(false);

    await sheet.settleAt(-1);
    await sheet.tick(5 * SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(SHEET_CLOSE_RETRY_LIMIT);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps retrying past SHEET_CLOSE_RETRY_LIMIT a close undone after a reported open, and never settles it', async () => {
    const sheet = await mountRetryingSheet(true);
    await sheet.settleAt(0);
    await sheet.setOpen(false);

    await sheet.tick((SHEET_CLOSE_RETRY_LIMIT + 3) * SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(SHEET_CLOSE_RETRY_LIMIT + 3);
    expect(sheet.onCloseComplete).not.toHaveBeenCalled();
    expect(sheet.pending()).toBe(true);
  });

  it('stops retrying on unmount', async () => {
    const sheet = await mountRetryingSheet(true);
    await sheet.settleAt(0);
    await sheet.setOpen(false);
    await sheet.tick(SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(1);

    await sheet.unmount();
    await sheet.tick(3 * SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).toHaveBeenCalledTimes(1);
  });

  it('never retries a sheet that never opened', async () => {
    const sheet = await mountRetryingSheet(false);
    await sheet.setOpen(false);
    expect(sheet.pending()).toBe(false);

    await sheet.tick(5 * SHEET_CLOSE_RETRY_MS);
    expect(sheet.retryClose).not.toHaveBeenCalled();
  });

  it('throws nothing on the ticks with no retryClose, stays pending, and completes once on the -1', async () => {
    const sheet = await mountRetryingSheet(true, { withRetry: false });
    await sheet.settleAt(0);
    await sheet.setOpen(false);

    await sheet.tick(3 * SHEET_CLOSE_RETRY_MS);
    expect(sheet.pending()).toBe(true);

    await sheet.settleAt(-1);
    expect(sheet.onCloseComplete).toHaveBeenCalledTimes(1);
    expect(sheet.pending()).toBe(false);
  });
});
