import { act, renderHook } from '@testing-library/react-native';

import { resolveSheetClosedAtRestProps } from '@/components/ui/sheet';
import { useSheetCloseLifecycle } from '@/components/ui/sheet.hook';

const HIDDEN = { opacity: 0, pointerEvents: 'none' };
const SHOWN = { opacity: 1, pointerEvents: 'box-none' };

async function mountSheet(isOpen: boolean) {
  const onCloseComplete = jest.fn();
  const hook = await renderHook(
    ({ open }: { open: boolean }) => useSheetCloseLifecycle(open, onCloseComplete),
    { initialProps: { open: isOpen } },
  );
  return {
    onCloseComplete,
    drawn: () => resolveSheetClosedAtRestProps(hook.result.current.closeLifecycle),
    setOpen: (open: boolean) => hook.rerender({ open }),
    settleAt: (index: number) => act(() => hook.result.current.handleSheetIndexChange(index)),
    settleTwiceBeforeARender: (index: number) =>
      act(() => {
        hook.result.current.handleSheetIndexChange(index);
        hook.result.current.handleSheetIndexChange(index);
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
});
