import { act, renderHook } from '@testing-library/react-native';

import { resolveSheetClosedAtRestProps } from '@/components/ui/sheet';
import { useSheetCloseLifecycle } from '@/components/ui/sheet.hook';

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
